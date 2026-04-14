<?php

namespace Tests\Feature\Api\V1\Inventory;

use App\Models\Item;
use App\Models\Stock;
use App\Models\StockMovementLine;
use App\Models\UomConversion;
use PHPUnit\Framework\Attributes\Test;
use Tests\Feature\Inventory\InventoryTestCase;

/**
 * Tests for the stock-out endpoint (POST /api/v1/inventory/stock-out).
 *
 * Extends InventoryTestCase which sets up:
 *  - An inventory-manager user with stock.manage + all inventory permissions
 *  - A branch, operating unit, and inventory location
 *  - UoMs: KG (base) and GR (with KG→GR conversion)
 *  - Passport auth as the inventory-manager user
 */
class StockOutTest extends InventoryTestCase
{
    protected Item $item;

    protected \App\Models\ItemVariant $variant;

    protected function setUp(): void
    {
        parent::setUp();

        $this->item = $this->createItem([
            'sku' => 'ITM-TEST-001',
            'name' => 'Test Item',
            'type' => 'INSUMO',
        ]);

        $this->variant = $this->createItemVariant($this->item, [
            'code' => 'VTEST-001',
            'name' => 'Test Variant',
            'avg_unit_cost' => 50.0000,
            'last_unit_cost' => 50.0000,
            'sale_price' => 75.0000,
        ]);

        // Create initial stock (100 KG on hand)
        Stock::create([
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $this->variant->id,
            'on_hand' => 100.0000,
            'reserved' => 0,
        ]);
    }

    #[Test]
    public function it_registers_a_sale_with_profit_calculation()
    {
        $response = $this->postJson('/api/v1/inventory/stock-out', [
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $this->variant->id,
            'qty' => 10,
            'uom_id' => $this->uomKg->id,
            'reason' => 'SALE',
            'sale_price' => 75.00,
            'reference' => 'SALE-001',
            'notes' => 'Test sale',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'id',
                    'from_location_id',
                    'to_location_id',
                    'item_variant_id',
                    'qty',
                    'reason',
                    'status',
                    'reference',
                    'meta',
                    'lines',
                ],
                'message',
            ]);

        $this->assertEquals('SALE', $response->json('data.reason'));
        $this->assertEquals('POSTED', $response->json('data.status'));
        $this->assertEquals('10.0000', $response->json('data.qty'));

        // Verify profit calculation in line
        $line = StockMovementLine::first();
        $this->assertEquals(75.0000, (float) $line->sale_price);
        $this->assertEquals(750.0000, (float) $line->sale_total); // 10 * 75
        $this->assertEquals(50.0000, (float) $line->unit_cost);
        $this->assertEquals(25.0000, (float) $line->profit_margin); // 75 - 50
        $this->assertEquals(250.0000, (float) $line->profit_total); // 10 * 25

        // Verify stock was decremented
        $stock = Stock::where('inventory_location_id', $this->location->id)
            ->where('item_variant_id', $this->variant->id)
            ->first();
        $this->assertEquals(90.0000, (float) $stock->on_hand);
    }

    #[Test]
    public function it_registers_consumption_without_sale_price()
    {
        $response = $this->postJson('/api/v1/inventory/stock-out', [
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $this->variant->id,
            'qty' => 5,
            'uom_id' => $this->uomKg->id,
            'reason' => 'CONSUMPTION',
            'reference' => 'CONS-001',
            'notes' => 'Test consumption',
        ]);

        $response->assertStatus(201);
        $this->assertEquals('CONSUMPTION', $response->json('data.reason'));

        // Verify no profit calculation for consumption
        $line = StockMovementLine::first();
        $this->assertNull($line->sale_price);
        $this->assertNull($line->sale_total);
        $this->assertNull($line->profit_margin);
        $this->assertNull($line->profit_total);

        // Verify stock was decremented
        $stock = Stock::where('inventory_location_id', $this->location->id)
            ->where('item_variant_id', $this->variant->id)
            ->first();
        $this->assertEquals(95.0000, (float) $stock->on_hand);
    }

    #[Test]
    public function it_validates_insufficient_stock()
    {
        $response = $this->postJson('/api/v1/inventory/stock-out', [
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $this->variant->id,
            'qty' => 150, // More than available (100)
            'uom_id' => $this->uomKg->id,
            'reason' => 'SALE',
            'sale_price' => 75.00,
        ]);

        $response->assertStatus(400)
            ->assertJson([
                'success' => false,
            ]);

        $this->assertStringContainsString('Insufficient stock', $response->json('message'));
    }

    #[Test]
    public function it_handles_uom_conversion_for_sales()
    {
        // Ensure GR→KG conversion exists (1000 GR = 1 KG → factor = 0.001)
        UomConversion::firstOrCreate([
            'from_uom_id' => $this->uomGr->id,
            'to_uom_id' => $this->uomKg->id,
        ], [
            'factor' => 0.001,
            'tolerance_percent' => 1.0,
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/v1/inventory/stock-out', [
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $this->variant->id,
            'qty' => 5000, // 5000 GR = 5 KG
            'uom_id' => $this->uomGr->id,
            'reason' => 'SALE',
            'sale_price' => 0.075, // Price per gram
            'reference' => 'SALE-002',
        ]);

        $response->assertStatus(201);

        // Verify conversion
        $line = StockMovementLine::first();
        $this->assertEquals(5000.0000, (float) $line->qty); // Original qty in GR
        $this->assertEquals(5.0000, (float) $line->base_qty); // Converted to KG
        $this->assertEquals(0.001, (float) $line->conversion_factor);

        // Profit: sale_price per GR = 0.075 → per KG = 75 → margin = 75-50 = 25 → total = 5*25 = 125
        $this->assertEquals(0.075, (float) $line->sale_price);
        $this->assertEquals(375.0000, (float) $line->sale_total); // 5000 * 0.075
        $this->assertEquals(25.0000, (float) $line->profit_margin);
        $this->assertEquals(125.0000, (float) $line->profit_total);

        // Verify stock was decremented in base UOM
        $stock = Stock::where('inventory_location_id', $this->location->id)
            ->where('item_variant_id', $this->variant->id)
            ->first();
        $this->assertEquals(95.0000, (float) $stock->on_hand); // 100 - 5
    }

    #[Test]
    public function it_validates_required_fields()
    {
        $response = $this->postJson('/api/v1/inventory/stock-out', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors([
                'inventory_location_id',
                'item_variant_id',
                'qty',
                'uom_id',
                'reason',
            ]);
    }

    #[Test]
    public function it_validates_reason_must_be_sale_or_consumption()
    {
        $response = $this->postJson('/api/v1/inventory/stock-out', [
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $this->variant->id,
            'qty' => 10,
            'uom_id' => $this->uomKg->id,
            'reason' => 'INVALID_REASON',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['reason']);
    }

    #[Test]
    public function it_validates_quantity_must_be_positive()
    {
        $response = $this->postJson('/api/v1/inventory/stock-out', [
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $this->variant->id,
            'qty' => 0,
            'uom_id' => $this->uomKg->id,
            'reason' => 'SALE',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['qty']);
    }

    #[Test]
    public function it_returns_404_for_nonexistent_location()
    {
        $response = $this->postJson('/api/v1/inventory/stock-out', [
            'inventory_location_id' => 99999,
            'item_variant_id' => $this->variant->id,
            'qty' => 10,
            'uom_id' => $this->uomKg->id,
            'reason' => 'SALE',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['inventory_location_id']);
    }

    #[Test]
    public function it_calculates_zero_profit_when_cost_equals_price()
    {
        $response = $this->postJson('/api/v1/inventory/stock-out', [
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $this->variant->id,
            'qty' => 10,
            'uom_id' => $this->uomKg->id,
            'reason' => 'SALE',
            'sale_price' => 50.00, // Same as avg_unit_cost
        ]);

        $response->assertStatus(201);

        $line = StockMovementLine::first();
        $this->assertEquals(50.0000, (float) $line->sale_price);
        $this->assertEquals(50.0000, (float) $line->unit_cost);
        $this->assertEquals(0.0000, (float) $line->profit_margin);
        $this->assertEquals(0.0000, (float) $line->profit_total);
    }

    #[Test]
    public function it_records_negative_profit_for_loss_sales()
    {
        $response = $this->postJson('/api/v1/inventory/stock-out', [
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $this->variant->id,
            'qty' => 10,
            'uom_id' => $this->uomKg->id,
            'reason' => 'SALE',
            'sale_price' => 30.00, // Less than avg_unit_cost (50)
        ]);

        $response->assertStatus(201);

        $line = StockMovementLine::first();
        $this->assertEquals(30.0000, (float) $line->sale_price);
        $this->assertEquals(50.0000, (float) $line->unit_cost);
        $this->assertEquals(-20.0000, (float) $line->profit_margin); // 30 - 50
        $this->assertEquals(-200.0000, (float) $line->profit_total); // 10 * -20
    }
}
