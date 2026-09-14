<?php

namespace Tests\Feature\Inventory;

use App\Models\ItemVariant;
use App\Models\Stock;
use App\Models\StockMovement;
use App\Models\StockMovementLine;
use PHPUnit\Framework\Attributes\Test;

/**
 * #579 — the `total_value` backfill sums the immutable movement ledger's own
 * evidence rather than reconstructing `on_hand * weighted_avg_cost` (a code
 * review finding: the stored average is a rounded, display-only rate, so
 * that reconstruction can already disagree with what was actually posted for
 * a Stock row that predates the accumulator). Each test creates its fixtures
 * with the column already in place (so the Stock model itself works
 * normally), then drives `down()` (drops the column/constraint, restoring
 * the pre-migration shape) followed by `up()` (re-adds the column and
 * re-runs the backfill against the now-existing ledger evidence) directly —
 * the same approach as StockMovementLineColumnRemovalMigrationTest.
 */
class AddTotalValueToStockMigrationTest extends InventoryTestCase
{
    private const MIGRATION = 'database/migrations/2026_09_12_210000_add_total_value_to_stock_table.php';

    private ItemVariant $variant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->variant = $this->createItemVariant($this->createItem());
    }

    private function postedMovementWithLine(float $qty, float $unitCost, ?int $toLocationId, ?int $fromLocationId, string $status = StockMovement::STATUS_POSTED): StockMovement
    {
        $movement = StockMovement::create([
            'from_location_id' => $fromLocationId,
            'to_location_id' => $toLocationId,
            'item_variant_id' => $this->variant->id,
            'user_id' => $this->user->id,
            'qty' => $qty,
            'reason' => StockMovement::REASON_PURCHASE_RECEIPT,
            'status' => $status,
            'meta' => [],
            'posted_at' => now(),
        ]);

        StockMovementLine::create([
            'stock_movement_id' => $movement->id,
            'uom_id' => $this->uomKg->id,
            'qty' => $qty,
            'conversion_factor' => 1,
            'unit_cost' => $unitCost,
            'line_total' => round($qty * $unitCost, 4),
            'meta' => [],
        ]);

        return $movement;
    }

    #[Test]
    public function it_backfills_the_exact_ledger_sum_instead_of_reconstructing_from_the_rounded_average(): void
    {
        // Codex review finding on this Issue's own PR (#626): 1 unit @ 0.1
        // then 2 units @ 0.2 accumulate an exact value of 0.5, but the
        // rounded average this system stores is 0.1667 — on_hand (3) *
        // weighted_avg_cost (0.1667) = 0.5001, not 0.5. A naive backfill from
        // that reconstruction would already carry a 0.0001 residual before
        // any reversal is even attempted.
        $this->postedMovementWithLine(1, 0.1, $this->location->id, null);
        $this->postedMovementWithLine(2, 0.2, $this->location->id, null);

        $stock = Stock::create([
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $this->variant->id,
            'on_hand' => 3,
            'reserved' => 0,
            'weighted_avg_cost' => 0.1667,
        ]);

        $migration = require base_path(self::MIGRATION);
        $migration->down();
        $migration->up();

        $this->assertSame('0.5000', $stock->fresh()->total_value);
    }

    #[Test]
    public function it_nets_a_reversed_movement_against_its_compensating_movement_to_zero(): void
    {
        // A receipt that was posted then reversed contributes nothing to the
        // backfilled total — its own (now REVERSED-status) line and its
        // compensating movement's line net to exactly zero via the sum
        // itself, not via an on_hand-happens-to-be-zero special case (which
        // would still be wrong for a *partial* reversal).
        // A StockMovement cannot be created directly with status REVERSED
        // (EnforcesStockMovementContract) — post it, then transition it, the
        // same as the real reversal flow (e.g. ReceiptService) does.
        $original = $this->postedMovementWithLine(10, 5, $this->location->id, null);
        $original->forceFill(['status' => StockMovement::STATUS_REVERSED, 'reversed_at' => now()])->save();
        $compensating = StockMovement::create([
            'from_location_id' => $this->location->id,
            'to_location_id' => null,
            'item_variant_id' => $this->variant->id,
            'user_id' => $this->user->id,
            'qty' => 10,
            'reason' => StockMovement::REASON_PURCHASE_RECEIPT_REVERSAL,
            'status' => StockMovement::STATUS_POSTED,
            'reverses_stock_movement_id' => $original->id,
            'meta' => [],
            'posted_at' => now(),
        ]);
        StockMovementLine::create([
            'stock_movement_id' => $compensating->id,
            'uom_id' => $this->uomKg->id,
            'qty' => 10,
            'conversion_factor' => 1,
            'unit_cost' => 5,
            'line_total' => 50,
            'meta' => [],
        ]);

        $stock = Stock::create([
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $this->variant->id,
            'on_hand' => 0,
            'reserved' => 0,
            'weighted_avg_cost' => 0,
        ]);

        $migration = require base_path(self::MIGRATION);
        $migration->down();
        $migration->up();

        $this->assertSame('0.0000', $stock->fresh()->total_value);
    }

    #[Test]
    public function it_reconciles_a_negative_residual_from_mismatched_inbound_and_outbound_rounding_bases(): void
    {
        // Codex review finding on this Issue's own PR (#626): inbound and
        // outbound lines are not recorded on the same valuation basis — a
        // Receipt's line_total is its exact acquisition total, while
        // StockOutService's is baseQuantity * the already scale-4-rounded
        // weighted_avg_cost. A legacy receipt of exactly 240 units worth
        // 1000.0000 followed by a full 240-unit stock-out at the resulting
        // WAC (4.1667) nets 1000.0000 - 1000.0080 = -0.0080, which the
        // nonnegative CHECK constraint below would otherwise reject.
        $receipt = StockMovement::create([
            'from_location_id' => null,
            'to_location_id' => $this->location->id,
            'item_variant_id' => $this->variant->id,
            'user_id' => $this->user->id,
            'qty' => 240,
            'reason' => StockMovement::REASON_PURCHASE_RECEIPT,
            'status' => StockMovement::STATUS_POSTED,
            'meta' => [],
            'posted_at' => now(),
        ]);
        StockMovementLine::create([
            'stock_movement_id' => $receipt->id,
            'uom_id' => $this->uomKg->id,
            'qty' => 240,
            'conversion_factor' => 1,
            'unit_cost' => 4.1667,
            'line_total' => 1000.0000,
            'meta' => [],
        ]);

        $stockOut = StockMovement::create([
            'from_location_id' => $this->location->id,
            'to_location_id' => null,
            'item_variant_id' => $this->variant->id,
            'user_id' => $this->user->id,
            'qty' => 240,
            'reason' => StockMovement::REASON_CONSUMPTION,
            'status' => StockMovement::STATUS_POSTED,
            'meta' => [],
            'posted_at' => now(),
        ]);
        StockMovementLine::create([
            'stock_movement_id' => $stockOut->id,
            'uom_id' => $this->uomKg->id,
            'qty' => 240,
            'conversion_factor' => 1,
            'unit_cost' => 4.1667,
            'line_total' => round(240 * 4.1667, 4),
            'meta' => [],
        ]);

        $stock = Stock::create([
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $this->variant->id,
            'on_hand' => 0,
            'reserved' => 0,
            'weighted_avg_cost' => 4.1667,
        ]);

        $migration = require base_path(self::MIGRATION);
        $migration->down();
        $migration->up();

        $this->assertSame('0.0000', $stock->fresh()->total_value);
    }

    #[Test]
    public function it_falls_back_to_the_naive_reconstruction_for_a_row_with_no_movement_evidence(): void
    {
        // A Stock row seeded directly (bypassing every posting service) has
        // no ledger evidence to sum — the only case where the previous
        // approximation is still the best available answer.
        $stock = Stock::create([
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $this->variant->id,
            'on_hand' => 10,
            'reserved' => 0,
            'weighted_avg_cost' => 3,
        ]);

        $migration = require base_path(self::MIGRATION);
        $migration->down();
        $migration->up();

        $this->assertSame('30.0000', $stock->fresh()->total_value);
    }
}
