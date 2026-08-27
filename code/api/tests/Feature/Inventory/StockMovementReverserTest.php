<?php

namespace Tests\Feature\Inventory;

use App\Exceptions\InvalidStockMovementContractException;
use App\Exceptions\StockMovementNotReversibleException;
use App\Exceptions\StockMovementReversalBoundaryException;
use App\Models\InventoryLocation;
use App\Models\ItemVariant;
use App\Models\Stock;
use App\Models\StockMovement;
use App\Models\StockMovementLine;
use App\Services\Inventory\StockMovementReverser;
use App\Services\Inventory\StockMutationService;
use PHPUnit\Framework\Attributes\Test;

/**
 * The compensating-reversal workflow (#438) — Acceptance Criteria 3 and 4:
 * a posted movement is reversed exactly once by an immutable, causally-linked
 * compensating movement, and an impossible reversal fails atomically.
 */
class StockMovementReverserTest extends InventoryTestCase
{
    private StockMovementReverser $reverser;

    private ItemVariant $variant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->reverser = app(StockMovementReverser::class);
        $this->variant = $this->createItemVariant($this->createItem());
    }

    private function stockRow(float $onHand, ?InventoryLocation $location = null): Stock
    {
        return Stock::create([
            'inventory_location_id' => ($location ?? $this->location)->id,
            'item_variant_id' => $this->variant->id,
            'on_hand' => $onHand,
            'reserved' => 0,
        ]);
    }

    private function postedMovement(array $overrides = [], float $qty = 10): StockMovement
    {
        $movement = StockMovement::create(array_merge([
            'from_location_id' => null,
            'to_location_id' => $this->location->id,
            'item_variant_id' => $this->variant->id,
            'user_id' => $this->user->id,
            'qty' => $qty,
            'reason' => StockMovement::REASON_OPENING_BALANCE,
            'status' => StockMovement::STATUS_POSTED,
            'meta' => [],
            'posted_at' => now(),
        ], $overrides));

        StockMovementLine::create([
            'stock_movement_id' => $movement->id,
            'item_variant_id' => $this->variant->id,
            'uom_id' => $this->uomKg->id,
            'qty' => $qty,
            'base_qty' => $qty,
            'conversion_factor' => 1,
            'unit_cost' => 0,
            'line_total' => 0,
            'meta' => [],
        ]);

        return $movement->fresh();
    }

    #[Test]
    public function it_reverses_a_posted_entry_and_restores_the_balance_exactly_once(): void
    {
        $this->stockRow(10);
        $movement = $this->postedMovement();

        $compensating = $this->reverser->reverse($movement, $this->user->id, 'Counted wrong');

        $this->assertSame($movement->id, $compensating->reverses_stock_movement_id);
        $this->assertSame($this->location->id, $compensating->from_location_id);
        $this->assertNull($compensating->to_location_id);
        $this->assertEquals(10.0, (float) $compensating->qty);
        $this->assertSame(StockMovement::REASON_OPENING_BALANCE, $compensating->reason);
        $this->assertTrue($compensating->isPosted());
        $this->assertTrue($compensating->isReversal());

        $original = $movement->fresh();
        $this->assertTrue($original->isReversed());
        $this->assertNotNull($original->reversed_at);
        $this->assertSame($this->user->id, $original->reversed_by_user_id);
        $this->assertSame('Counted wrong', $original->reversal_reason);

        $this->assertEquals(0.0, (float) Stock::where('inventory_location_id', $this->location->id)
            ->where('item_variant_id', $this->variant->id)->value('on_hand'));
    }

    #[Test]
    public function it_reverses_a_posted_exit_by_adding_the_stock_back(): void
    {
        $stock = $this->stockRow(10);
        $movement = $this->postedMovement([
            'from_location_id' => $this->location->id,
            'to_location_id' => null,
            'reason' => StockMovement::REASON_SALE,
        ], qty: 4);
        $stock->decreaseOnHand(4);
        $this->assertEquals(6.0, (float) $stock->fresh()->on_hand);

        $compensating = $this->reverser->reverse($movement, $this->user->id, 'sale voided');

        $this->assertSame($this->location->id, $compensating->to_location_id);
        $this->assertNull($compensating->from_location_id);
        $this->assertEquals(10.0, (float) $stock->fresh()->on_hand);
    }

    #[Test]
    public function it_reverses_a_transfer_in_both_directions(): void
    {
        $destination = InventoryLocation::create([
            'operating_unit_id' => $this->operatingUnit->id,
            'name' => 'Kitchen', 'type' => 'KITCHEN', 'priority' => 20, 'is_active' => true,
        ]);
        $source = $this->stockRow(10);
        $target = $this->stockRow(10, $destination);

        $movement = $this->postedMovement([
            'from_location_id' => $this->location->id,
            'to_location_id' => $destination->id,
            'reason' => StockMovement::REASON_TRANSFER,
        ], qty: 3);

        $this->reverser->reverse($movement, $this->user->id, 'wrong destination');

        $this->assertEquals(13.0, (float) $source->fresh()->on_hand);
        $this->assertEquals(7.0, (float) $target->fresh()->on_hand);
    }

    #[Test]
    public function it_refuses_to_reverse_the_same_movement_twice(): void
    {
        $this->stockRow(10);
        $movement = $this->postedMovement();

        $this->reverser->reverse($movement, $this->user->id, 'first');

        $this->expectException(StockMovementNotReversibleException::class);
        $this->reverser->reverse($movement->fresh(), $this->user->id, 'second');
    }

    #[Test]
    public function the_reversal_link_is_unique_so_a_movement_is_compensated_at_most_once(): void
    {
        $this->stockRow(10);
        $movement = $this->postedMovement();
        $this->reverser->reverse($movement, $this->user->id, 'first');

        $this->expectException(InvalidStockMovementContractException::class);

        StockMovement::create([
            'from_location_id' => $this->location->id,
            'to_location_id' => null,
            'item_variant_id' => $this->variant->id,
            'qty' => 10,
            'reason' => StockMovement::REASON_OPENING_BALANCE,
            'status' => StockMovement::STATUS_POSTED,
            'reverses_stock_movement_id' => $movement->id,
            'meta' => [],
            'posted_at' => now(),
        ]);
    }

    #[Test]
    public function it_refuses_to_reverse_a_draft_movement(): void
    {
        $movement = StockMovement::create([
            'to_location_id' => $this->location->id,
            'item_variant_id' => $this->variant->id,
            'qty' => 5,
            'reason' => StockMovement::REASON_OPENING_BALANCE,
            'status' => StockMovement::STATUS_DRAFT,
            'meta' => [],
        ]);

        $this->expectException(StockMovementNotReversibleException::class);
        $this->reverser->reverse($movement, $this->user->id, null);
    }

    #[Test]
    public function it_refuses_to_reverse_a_reversal_movement(): void
    {
        $this->stockRow(10);
        $movement = $this->postedMovement();
        $compensating = $this->reverser->reverse($movement, $this->user->id, 'first');

        $this->expectException(StockMovementNotReversibleException::class);
        $this->reverser->reverse($compensating->fresh(), $this->user->id, 'reverse the reversal');
    }

    #[Test]
    public function the_movement_ledger_reconciles_with_on_hand_after_a_reversal(): void
    {
        $stock = $this->stockRow(0);

        // Entry of 10, then an exit of 4 -> on_hand 6.
        $entry = $this->postedMovement(qty: 10);
        $this->stockMutation()->receiveInto($this->location->id, $this->variant->id, 10);
        $exit = $this->postedMovement([
            'from_location_id' => $this->location->id,
            'to_location_id' => null,
            'reason' => StockMovement::REASON_CONSUMPTION,
        ], qty: 4);
        $stock->fresh()->decreaseOnHand(4);

        // Reverse the exit -> on_hand back to 10.
        $this->reverser->reverse($exit, $this->user->id, 'miscount');

        $onHand = (float) $stock->fresh()->on_hand;

        // A reversal is itself a real posted movement, so the ledger
        // reconciles over *every* movement — entry adds, exit subtracts:
        //   entry(+10) + exit(-4) + reversal-of-exit(+4) == on_hand(10).
        $ledgerNet = 0.0;
        foreach (StockMovement::where('item_variant_id', $this->variant->id)->get() as $m) {
            $ledgerNet += $m->to_location_id !== null ? (float) $m->qty : 0.0;
            $ledgerNet -= $m->from_location_id !== null ? (float) $m->qty : 0.0;
        }

        $this->assertEquals(10.0, $onHand);
        $this->assertEquals($onHand, $ledgerNet);
        $this->assertTrue($entry->fresh()->isPosted());
        $this->assertTrue($exit->fresh()->isReversed());
    }

    private function stockMutation(): StockMutationService
    {
        return app(StockMutationService::class);
    }

    #[Test]
    public function it_blocks_a_reversal_that_would_drive_a_location_negative_and_stays_atomic(): void
    {
        $stock = $this->stockRow(10);
        $movement = $this->postedMovement(qty: 10);
        $stock->decreaseOnHand(7); // 3 left — less than the 10 the movement added

        try {
            $this->reverser->reverse($movement, $this->user->id, 'too late');
            $this->fail('Expected a StockMovementReversalBoundaryException.');
        } catch (StockMovementReversalBoundaryException) {
            // expected
        }

        $this->assertSame(0, StockMovement::where('reverses_stock_movement_id', $movement->id)->count());
        $this->assertTrue($movement->fresh()->isPosted());
        $this->assertEquals(3.0, (float) $stock->fresh()->on_hand);
    }
}
