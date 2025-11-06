<?php

namespace Tests\Feature\Api\V1\Stock;

use App\Models\InventoryLocation;
use App\Models\Item;
use App\Models\ItemVariant;
use App\Models\OperatingUnit;
use App\Models\Stock;
use App\Models\UnitOfMeasure;
use PHPUnit\Framework\Attributes\Test;
use Tests\Feature\Inventory\InventoryTestCase;

class StockQueryTest extends InventoryTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Create test stock data
        $this->createTestStockData();
    }

    protected function createTestStockData()
    {
        $location = InventoryLocation::first();

        $uom = UnitOfMeasure::where('code', 'KG')->first();
        
        $item = Item::create([
            'sku' => 'TEST-STOCK-001',
            'name' => 'Test Item for Stock',
            'type' => 'INSUMO',
            'is_active' => true,
        ]);

        $variant1 = ItemVariant::create([
            'item_id' => $item->id,
            'uom_id' => $uom->id,
            'code' => 'VAR-001',
            'name' => 'Variant 1',
            'is_active' => true,
        ]);

        $variant2 = ItemVariant::create([
            'item_id' => $item->id,
            'uom_id' => $uom->id,
            'code' => 'VAR-002',
            'name' => 'Variant 2',
            'is_active' => true,
        ]);

        // Create stock in location
        Stock::create([
            'inventory_location_id' => $location->id,
            'item_variant_id' => $variant1->id,
            'on_hand' => 100.0,
            'reserved' => 10.0,
            'weighted_avg_cost' => 50.0,
        ]);

        Stock::create([
            'inventory_location_id' => $location->id,
            'item_variant_id' => $variant2->id,
            'on_hand' => 50.0,
            'reserved' => 5.0,
            'weighted_avg_cost' => 75.0,
        ]);
    }

    public function test_it_lists_all_stock()
    {
        $response = $this->getJson('/api/v1/stock');

        $response->assertOk()
            ->assertJsonStructure([
                'status',
                'data' => [
                    '*' => [
                        'id',
                        'inventory_location_id',
                        'item_variant_id',
                        'on_hand',
                        'reserved',
                    ],
                ],
                'meta' => [
                    'current_page',
                    'total',
                ],
            ]);

        // Should have at least 2 stock records
        $this->assertGreaterThanOrEqual(2, count($response->json('data')));
    }

    public function test_it_filters_stock_by_location()
    {
        $location = InventoryLocation::first();

        $response = $this->getJson("/api/v1/stock?inventory_location_id={$location->id}");

        $response->assertOk();

        $stocks = $response->json('data');
        foreach ($stocks as $stock) {
            $this->assertEquals($location->id, $stock['inventory_location_id']);
        }
    }

    public function test_it_filters_stock_by_item_variant()
    {
        $variant = ItemVariant::where('code', 'VAR-001')->first();

        $response = $this->getJson("/api/v1/stock?item_variant_id={$variant->id}");

        $response->assertOk();

        $stocks = $response->json('data');
        foreach ($stocks as $stock) {
            $this->assertEquals($variant->id, $stock['item_variant_id']);
        }

        // Should have 1 location for VAR-001
        $this->assertEquals(1, count($stocks));
    }

    public function test_it_filters_stock_by_min_on_hand()
    {
        $response = $this->getJson('/api/v1/stock?min_on_hand=50');

        $response->assertOk();

        $stocks = $response->json('data');
        foreach ($stocks as $stock) {
            $this->assertGreaterThanOrEqual(50, $stock['on_hand']);
        }
    }

    public function test_it_gets_stock_summary_by_location()
    {
        $location = InventoryLocation::first();

        $response = $this->getJson("/api/v1/stock/by-location/{$location->id}");

        $response->assertOk()
            ->assertJsonStructure([
                'status',
                'data' => [
                    'inventory_location' => [
                        'id',
                        'name',
                        'type',
                        'operating_unit',
                    ],
                    'summary' => [
                        'total_variants',
                        'total_on_hand',
                        'total_reserved',
                        'total_available',
                        'total_inventory_value',
                    ],
                    'items' => [
                        '*' => [
                            'item_variant_id',
                            'item_variant_code',
                            'item_variant_name',
                            'item_name',
                            'item_sku',
                            'on_hand',
                            'reserved',
                            'available',
                            'weighted_avg_cost',
                            'total_value',
                        ],
                    ],
                ],
            ]);

        $summary = $response->json('data.summary');
        $this->assertEquals(2, $summary['total_variants']);
        $this->assertEquals(150.0, $summary['total_on_hand']); // 100 + 50
    }

    public function test_it_gets_stock_summary_by_variant()
    {
        $variant = ItemVariant::where('code', 'VAR-001')->first();

        $response = $this->getJson("/api/v1/stock/by-variant/{$variant->id}");

        $response->assertOk()
            ->assertJsonStructure([
                'status',
                'data' => [
                    'item_variant' => [
                        'id',
                        'code',
                        'name',
                        'item_name',
                        'item_sku',
                    ],
                    'summary' => [
                        'total_locations',
                        'total_on_hand',
                        'total_reserved',
                        'total_available',
                        'avg_weighted_cost',
                        'total_inventory_value',
                    ],
                    'locations' => [
                        '*' => [
                            'inventory_location_id',
                            'location_name',
                            'location_type',
                            'operating_unit',
                            'on_hand',
                            'reserved',
                            'available',
                            'weighted_avg_cost',
                            'total_value',
                        ],
                    ],
                ],
            ]);

        $summary = $response->json('data.summary');
        $this->assertEquals(1, $summary['total_locations']);
        $this->assertEquals(100.0, $summary['total_on_hand']);
    }

    public function test_it_returns_404_for_invalid_location()
    {
        $response = $this->getJson('/api/v1/stock/by-location/99999');

        $response->assertStatus(404);
    }

    public function test_it_returns_404_for_invalid_variant()
    {
        $response = $this->getJson('/api/v1/stock/by-variant/99999');

        $response->assertStatus(404);
    }

    public function test_it_returns_empty_summary_for_location_without_stock()
    {
        // Create a new location without stock
        $operatingUnit = OperatingUnit::first();
        $location = InventoryLocation::create([
            'operating_unit_id' => $operatingUnit->id,
            'name' => 'Empty Location',
            'type' => 'TEMP',
            'priority' => 50,
            'is_active' => true,
        ]);

        $response = $this->getJson("/api/v1/stock/by-location/{$location->id}");

        $response->assertOk();

        $summary = $response->json('data.summary');
        $this->assertEquals(0, $summary['total_variants']);
        $this->assertEquals(0, $summary['total_on_hand']);
    }

    public function test_stock_summary_calculates_total_value_correctly()
    {
        // Get the location that has our test stock
        $stock = Stock::with('inventoryLocation')->first();
        $location = $stock->inventoryLocation;

        $response = $this->getJson("/api/v1/stock/by-location/{$location->id}");

        $response->assertOk();

        $summary = $response->json('data.summary');
        
        // Calculate expected value from actual stock records
        $expectedValue = Stock::where('inventory_location_id', $location->id)
            ->get()
            ->sum(fn($s) => $s->on_hand * $s->weighted_avg_cost);
        
        $this->assertGreaterThan(0, $summary['total_inventory_value']);
        $this->assertEquals($expectedValue, $summary['total_inventory_value']);
    }
}
