<?php

namespace Tests\Feature\Inventory;

use App\Exceptions\ImmutableStockMovementException;
use App\Exceptions\InvalidStockMovementContractException;
use App\Models\InventoryLocation;
use App\Models\ItemVariant;
use App\Models\StockMovement;
use App\Models\StockMovementLine;
use PHPUnit\Framework\Attributes\Test;

/**
 * Lifecycle, immutability and source/destination invariants of the
 * normalized Stock Movement contract (#438) — Acceptance Criteria 1, 2 and 4.
 */
class StockMovementContractTest extends InventoryTestCase
{
    private ItemVariant $variant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->variant = $this->createItemVariant($this->createItem());
    }

    private function postedEntry(float $qty = 10, bool $withLine = true): StockMovement
    {
        $movement = StockMovement::create([
            'from_location_id' => null,
            'to_location_id' => $this->location->id,
            'item_variant_id' => $this->variant->id,
            'user_id' => $this->user->id,
            'qty' => $qty,
            'reason' => StockMovement::REASON_OPENING_BALANCE,
            'status' => StockMovement::STATUS_POSTED,
            'meta' => [],
            'posted_at' => now(),
        ]);

        if ($withLine) {
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
        }

        return $movement->fresh('lines');
    }

    // ---- AC1: header and lines cannot disagree ------------------------------

    #[Test]
    public function a_line_cannot_name_a_different_variant_than_its_header(): void
    {
        $movement = $this->postedEntry(withLine: false);
        $otherVariant = $this->createItemVariant($this->createItem());

        $this->expectException(InvalidStockMovementContractException::class);

        StockMovementLine::create([
            'stock_movement_id' => $movement->id,
            'item_variant_id' => $otherVariant->id,
            'uom_id' => $this->uomKg->id,
            'qty' => 10, 'base_qty' => 10, 'conversion_factor' => 1,
            'unit_cost' => 0, 'line_total' => 0, 'meta' => [],
        ]);
    }

    #[Test]
    public function a_line_cannot_move_a_different_base_quantity_than_its_header(): void
    {
        $movement = $this->postedEntry(qty: 10, withLine: false);

        $this->expectException(InvalidStockMovementContractException::class);

        StockMovementLine::create([
            'stock_movement_id' => $movement->id,
            'item_variant_id' => $this->variant->id,
            'uom_id' => $this->uomKg->id,
            'qty' => 7, 'base_qty' => 7, 'conversion_factor' => 1,
            'unit_cost' => 0, 'line_total' => 0, 'meta' => [],
        ]);
    }

    #[Test]
    public function a_movement_carries_at_most_one_line(): void
    {
        $movement = $this->postedEntry(qty: 10); // already has one line

        $this->expectException(InvalidStockMovementContractException::class);

        StockMovementLine::create([
            'stock_movement_id' => $movement->id,
            'item_variant_id' => $this->variant->id,
            'uom_id' => $this->uomKg->id,
            'qty' => 10, 'base_qty' => 10, 'conversion_factor' => 1,
            'unit_cost' => 0, 'line_total' => 0, 'meta' => [],
        ]);
    }

    // ---- AC2: posted history is append-only -------------------------------

    #[Test]
    public function a_posted_movement_cannot_be_edited(): void
    {
        $movement = $this->postedEntry();
        $movement->qty = 999;

        $this->expectException(ImmutableStockMovementException::class);

        $movement->save();
    }

    #[Test]
    public function a_posted_movement_cannot_be_deleted(): void
    {
        $movement = $this->postedEntry();

        $this->expectException(ImmutableStockMovementException::class);

        $movement->delete();
    }

    #[Test]
    public function a_posted_movements_line_cannot_be_edited_or_deleted(): void
    {
        $movement = $this->postedEntry();
        $line = $movement->lines()->first();

        try {
            $line->unit_cost = 42;
            $line->save();
            $this->fail('Expected an ImmutableStockMovementException editing a posted line.');
        } catch (ImmutableStockMovementException) {
            // expected
        }

        $this->expectException(ImmutableStockMovementException::class);
        $line->delete();
    }

    #[Test]
    public function a_line_cannot_be_reparented_off_a_posted_movement_onto_a_draft_one(): void
    {
        $posted = $this->postedEntry(qty: 10);
        $line = $posted->lines()->first();

        $draft = StockMovement::create([
            'to_location_id' => $this->location->id,
            'item_variant_id' => $this->variant->id,
            'qty' => 10,
            'reason' => StockMovement::REASON_OPENING_BALANCE,
            'status' => StockMovement::STATUS_DRAFT,
            'meta' => [],
        ]);

        $line->stock_movement_id = $draft->id;

        $this->expectException(ImmutableStockMovementException::class);
        $line->save();
    }

    #[Test]
    public function a_draft_movement_can_still_be_edited_and_deleted(): void
    {
        $movement = StockMovement::create([
            'to_location_id' => $this->location->id,
            'item_variant_id' => $this->variant->id,
            'qty' => 5,
            'reason' => StockMovement::REASON_OPENING_BALANCE,
            'status' => StockMovement::STATUS_DRAFT,
            'meta' => [],
        ]);

        $movement->update(['reference' => 'DRAFT-EDIT']);
        $this->assertSame('DRAFT-EDIT', $movement->fresh()->reference);

        $movement->update(['status' => StockMovement::STATUS_POSTED]);
        $this->assertTrue($movement->fresh()->isPosted());

        $draft = StockMovement::create([
            'to_location_id' => $this->location->id,
            'item_variant_id' => $this->variant->id,
            'qty' => 5,
            'reason' => StockMovement::REASON_OPENING_BALANCE,
            'status' => StockMovement::STATUS_DRAFT,
            'meta' => [],
        ]);
        $draft->delete();
        $this->assertDatabaseMissing('stock_movements', ['id' => $draft->id]);
    }

    #[Test]
    public function a_posted_movement_may_transition_to_reversed_with_audit_columns(): void
    {
        $movement = $this->postedEntry();

        $movement->forceFill([
            'status' => StockMovement::STATUS_REVERSED,
            'reversed_at' => now(),
            'reversed_by_user_id' => $this->user->id,
            'reversal_reason' => 'audit adjustment',
        ])->save();

        $this->assertTrue($movement->fresh()->isReversed());
    }

    #[Test]
    public function a_reversed_movement_is_frozen_against_any_further_change(): void
    {
        $movement = $this->postedEntry();
        $movement->forceFill(['status' => StockMovement::STATUS_REVERSED, 'reversed_at' => now()])->save();

        $frozen = $movement->fresh();
        $frozen->reversal_reason = 'changed my mind';

        $this->expectException(ImmutableStockMovementException::class);
        $frozen->save();
    }

    // ---- AC4: invalid combinations fail atomically -----------------------

    #[Test]
    public function a_movement_quantity_must_be_positive(): void
    {
        $this->expectException(InvalidStockMovementContractException::class);

        StockMovement::create([
            'to_location_id' => $this->location->id,
            'item_variant_id' => $this->variant->id,
            'qty' => 0,
            'reason' => StockMovement::REASON_OPENING_BALANCE,
            'status' => StockMovement::STATUS_POSTED,
            'meta' => [],
        ]);
    }

    #[Test]
    public function an_exit_reason_rejects_a_destination_location(): void
    {
        $this->expectException(InvalidStockMovementContractException::class);

        StockMovement::create([
            'from_location_id' => $this->location->id,
            'to_location_id' => $this->location->id,
            'item_variant_id' => $this->variant->id,
            'qty' => 3,
            'reason' => StockMovement::REASON_SALE,
            'status' => StockMovement::STATUS_POSTED,
            'meta' => [],
        ]);
    }

    #[Test]
    public function an_entry_reason_rejects_a_source_location(): void
    {
        $other = InventoryLocation::create([
            'operating_unit_id' => $this->operatingUnit->id,
            'name' => 'Other', 'type' => 'MAIN', 'priority' => 10, 'is_active' => true,
        ]);

        $this->expectException(InvalidStockMovementContractException::class);

        StockMovement::create([
            'from_location_id' => $other->id,
            'to_location_id' => $this->location->id,
            'item_variant_id' => $this->variant->id,
            'qty' => 3,
            'reason' => StockMovement::REASON_OPENING_BALANCE,
            'status' => StockMovement::STATUS_POSTED,
            'meta' => [],
        ]);
    }

    #[Test]
    public function a_transfer_requires_both_a_source_and_a_destination(): void
    {
        $this->expectException(InvalidStockMovementContractException::class);

        StockMovement::create([
            'from_location_id' => $this->location->id,
            'to_location_id' => null,
            'item_variant_id' => $this->variant->id,
            'qty' => 3,
            'reason' => StockMovement::REASON_TRANSFER,
            'status' => StockMovement::STATUS_POSTED,
            'meta' => [],
        ]);
    }

    #[Test]
    public function source_and_destination_must_differ(): void
    {
        $this->expectException(InvalidStockMovementContractException::class);

        StockMovement::create([
            'from_location_id' => $this->location->id,
            'to_location_id' => $this->location->id,
            'item_variant_id' => $this->variant->id,
            'qty' => 3,
            'reason' => StockMovement::REASON_TRANSFER,
            'status' => StockMovement::STATUS_POSTED,
            'meta' => [],
        ]);
    }

    #[Test]
    public function a_movement_cannot_be_created_already_flagged_reversed(): void
    {
        $this->expectException(InvalidStockMovementContractException::class);

        StockMovement::create([
            'to_location_id' => $this->location->id,
            'item_variant_id' => $this->variant->id,
            'qty' => 3,
            'reason' => StockMovement::REASON_OPENING_BALANCE,
            'status' => StockMovement::STATUS_REVERSED,
            'meta' => [],
        ]);
    }
}
