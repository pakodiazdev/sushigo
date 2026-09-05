<?php

namespace Tests\Feature\Inventory;

use App\Models\Stock;
use App\Models\StockMovement;
use App\Models\VariantLocationAssignment;
use App\Models\VariantLocationReplenishmentPolicy;
use App\Services\Inventory\VariantLocationAssignmentBackfill;
use PHPUnit\Framework\Attributes\Test;

class VariantLocationAssignmentBackfillTest extends InventoryTestCase
{
    #[Test]
    public function it_backfills_the_distinct_union_of_stock_and_live_policy_pairs(): void
    {
        $withStock = $this->createItemVariant($this->createItem());
        $withPolicy = $this->createItemVariant($this->createItem());
        $withBoth = $this->createItemVariant($this->createItem());
        $withTrashedPolicyOnly = $this->createItemVariant($this->createItem());
        $withNothing = $this->createItemVariant($this->createItem());

        Stock::create(['inventory_location_id' => $this->location->id, 'item_variant_id' => $withStock->id, 'on_hand' => 4, 'reserved' => 0]);
        Stock::create(['inventory_location_id' => $this->location->id, 'item_variant_id' => $withBoth->id, 'on_hand' => 0, 'reserved' => 0]);

        VariantLocationReplenishmentPolicy::create(['inventory_location_id' => $this->location->id, 'item_variant_id' => $withPolicy->id, 'min_stock' => 1, 'max_stock' => 9]);
        VariantLocationReplenishmentPolicy::create(['inventory_location_id' => $this->location->id, 'item_variant_id' => $withBoth->id, 'min_stock' => 1, 'max_stock' => 9]);

        $trashedPolicy = VariantLocationReplenishmentPolicy::create(['inventory_location_id' => $this->location->id, 'item_variant_id' => $withTrashedPolicyOnly->id, 'min_stock' => 1, 'max_stock' => 9]);
        $trashedPolicy->delete();

        $summary = (new VariantLocationAssignmentBackfill)->run();

        $this->assertSame(3, $summary['inserted']);

        foreach ([$withStock, $withPolicy, $withBoth] as $variant) {
            $this->assertDatabaseHas('variant_location_assignments', [
                'inventory_location_id' => $this->location->id,
                'item_variant_id' => $variant->id,
                'deleted_at' => null,
            ]);
        }

        foreach ([$withTrashedPolicyOnly, $withNothing] as $variant) {
            $this->assertDatabaseMissing('variant_location_assignments', [
                'item_variant_id' => $variant->id,
            ]);
        }

        // every backfilled row carries a 26-char ULID public_id
        $this->assertTrue(
            VariantLocationAssignment::all()->every(fn ($a) => is_string($a->public_id) && strlen($a->public_id) === 26)
        );
    }

    #[Test]
    public function the_backfill_is_idempotent(): void
    {
        $variant = $this->createItemVariant($this->createItem());
        Stock::create(['inventory_location_id' => $this->location->id, 'item_variant_id' => $variant->id, 'on_hand' => 2, 'reserved' => 0]);

        $first = (new VariantLocationAssignmentBackfill)->run();
        $second = (new VariantLocationAssignmentBackfill)->run();

        $this->assertSame(1, $first['inserted']);
        $this->assertSame(0, $second['inserted']);
        $this->assertSame(1, $second['skipped']);
        $this->assertSame(1, VariantLocationAssignment::where('item_variant_id', $variant->id)->count());
    }

    #[Test]
    public function a_rerun_does_not_resurrect_a_deliberately_unassigned_pair(): void
    {
        $variant = $this->createItemVariant($this->createItem());
        // A zeroed Stock row can linger after a deliberate unassignment (a
        // non-zero one blocks it with 409).
        Stock::create(['inventory_location_id' => $this->location->id, 'item_variant_id' => $variant->id, 'on_hand' => 0, 'reserved' => 0]);

        $assignment = VariantLocationAssignment::create([
            'inventory_location_id' => $this->location->id, 'item_variant_id' => $variant->id,
        ]);
        $assignment->delete();

        $summary = (new VariantLocationAssignmentBackfill)->run();

        $this->assertSame(0, $summary['inserted']);
        $this->assertGreaterThanOrEqual(1, $summary['skipped']);
        $this->assertSame(
            0,
            VariantLocationAssignment::where('inventory_location_id', $this->location->id)
                ->where('item_variant_id', $variant->id)
                ->count()
        );
        $this->assertSoftDeleted('variant_location_assignments', ['id' => $assignment->id]);
    }

    #[Test]
    public function the_backfill_writes_no_stock_row_or_movement(): void
    {
        $variant = $this->createItemVariant($this->createItem());
        VariantLocationReplenishmentPolicy::create(['inventory_location_id' => $this->location->id, 'item_variant_id' => $variant->id, 'min_stock' => 1, 'max_stock' => 9]);

        (new VariantLocationAssignmentBackfill)->run();

        $this->assertSame(0, Stock::query()->where('item_variant_id', $variant->id)->count());
        $this->assertSame(0, StockMovement::query()->where('item_variant_id', $variant->id)->count());
    }
}
