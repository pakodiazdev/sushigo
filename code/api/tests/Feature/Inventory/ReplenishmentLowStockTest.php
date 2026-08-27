<?php

namespace Tests\Feature\Inventory;

use App\Models\InventoryLocation;
use App\Models\ItemVariant;
use App\Models\Stock;
use App\Models\VariantLocationReplenishmentPolicy;
use PHPUnit\Framework\Attributes\Test;

class ReplenishmentLowStockTest extends InventoryTestCase
{
    private InventoryLocation $bar;

    private ItemVariant $variant;

    protected function setUp(): void
    {
        parent::setUp();

        $this->bar = InventoryLocation::create([
            'operating_unit_id' => $this->operatingUnit->id,
            'name' => 'Bar Fridge',
            'type' => InventoryLocation::TYPE_BAR,
            'priority' => 40,
            'is_active' => true,
        ]);

        $this->variant = $this->createItemVariant($this->createItem(), ['code' => 'COLA-355']);

        // Same on_hand (5) at both locations...
        Stock::create(['inventory_location_id' => $this->location->id, 'item_variant_id' => $this->variant->id, 'on_hand' => 5, 'reserved' => 0, 'weighted_avg_cost' => 3]);
        Stock::create(['inventory_location_id' => $this->bar->id, 'item_variant_id' => $this->variant->id, 'on_hand' => 5, 'reserved' => 0, 'weighted_avg_cost' => 3]);

        // ...but a stricter reorder point in the warehouse than at the bar.
        VariantLocationReplenishmentPolicy::create(['inventory_location_id' => $this->location->id, 'item_variant_id' => $this->variant->id, 'min_stock' => 10, 'max_stock' => 100]);
        VariantLocationReplenishmentPolicy::create(['inventory_location_id' => $this->bar->id, 'item_variant_id' => $this->variant->id, 'min_stock' => 3, 'max_stock' => 12]);
    }

    #[Test]
    public function low_stock_scope_uses_the_resolved_location_specific_policy(): void
    {
        $low = Stock::query()->lowStock()->get();

        // Only the warehouse row is low (5 <= 10); the bar row is not (5 > 3).
        $this->assertCount(1, $low);
        $this->assertSame($this->location->id, $low->first()->inventory_location_id);
    }

    #[Test]
    public function item_variant_low_stock_scope_matches_when_any_location_is_low(): void
    {
        $this->assertTrue(ItemVariant::query()->lowStock()->whereKey($this->variant->id)->exists());

        // Raise the warehouse reorder point below on_hand → no location is low any more.
        VariantLocationReplenishmentPolicy::where('inventory_location_id', $this->location->id)
            ->update(['min_stock' => 1]);

        $this->assertFalse(ItemVariant::query()->lowStock()->whereKey($this->variant->id)->exists());
    }

    #[Test]
    public function stock_with_no_resolved_policy_is_never_low(): void
    {
        VariantLocationReplenishmentPolicy::query()->delete();

        $this->assertCount(0, Stock::query()->lowStock()->get());
    }

    #[Test]
    public function stock_by_variant_summary_reports_resolved_thresholds_and_low_flag(): void
    {
        $response = $this->getJson("/api/v1/stock/by-variant/{$this->variant->public_id}");

        $response->assertOk()->assertJsonPath('data.summary.low_stock_locations', 1);

        $byLocation = collect($response->json('data.locations'))->keyBy('inventory_location_id');

        $this->assertEquals(10.0, $byLocation[$this->location->public_id]['min_stock']);
        $this->assertTrue($byLocation[$this->location->public_id]['is_low_stock']);

        $this->assertEquals(3.0, $byLocation[$this->bar->public_id]['min_stock']);
        $this->assertFalse($byLocation[$this->bar->public_id]['is_low_stock']);
    }

    #[Test]
    public function stock_by_location_summary_reports_low_stock_variants(): void
    {
        $response = $this->getJson("/api/v1/stock/by-location/{$this->location->public_id}");

        $response->assertOk()
            ->assertJsonPath('data.summary.low_stock_variants', 1)
            ->assertJsonPath('data.items.0.is_low_stock', true)
            ->assertJsonPath('data.items.0.min_stock', fn ($v) => (float) $v === 10.0);
    }

    #[Test]
    public function list_stock_can_filter_to_low_rows_only(): void
    {
        $response = $this->getJson('/api/v1/stock?low_stock=1&item_variant_id='.$this->variant->public_id);

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
        $this->assertSame($this->location->public_id, $response->json('data.0.inventory_location.id'));
    }

    #[Test]
    public function list_stock_rows_carry_the_resolved_policy_and_low_flag(): void
    {
        $response = $this->getJson('/api/v1/stock?item_variant_id='.$this->variant->public_id);

        $response->assertOk();
        $rows = collect($response->json('data'))->keyBy(fn ($r) => $r['inventory_location']['id']);

        $this->assertEquals(10.0, $rows[$this->location->public_id]['min_stock']);
        $this->assertTrue($rows[$this->location->public_id]['is_low_stock']);
        $this->assertFalse($rows[$this->bar->public_id]['is_low_stock']);
    }
}
