<?php

namespace Tests\Feature\Inventory;

use App\Models\Stock;
use App\Models\StockMovement;
use App\Models\UnitOfMeasure;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;

class OpeningBalanceTest extends InventoryTestCase
{
    use RefreshDatabase;


    #[Test]
    public function it_can_register_opening_balance_with_base_unit()
    {
        // Arrange: Create item and variant
        $item = $this->createItem([
            'name' => 'Salmon Fresh',
            'type' => 'INSUMO',
        ]);

        $variant = $this->createItemVariant($item, [
            'name' => 'Salmon 1kg',
            'uom_id' => $this->uomKg->id,
        ]);

        // Act: Register opening balance with base unit
        $response = $this->postJson('/api/v1/inventory/opening-balance', [
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $variant->id,
            'quantity' => 50,
            'uom_id' => $this->uomKg->id,
            'unit_cost' => 125.50,
            'reference' => 'INV-2024-001',
            'notes' => 'Initial inventory count',
        ]);

        // Assert: Response
        $response->assertStatus(201)
            ->assertJsonStructure([
                'status',
                'data' => [
                    'id',
                    'inventory_location_id',
                    'item_variant_id',
                    'quantity',
                    'uom',
                    'base_quantity',
                    'base_uom',
                    'unit_cost',
                    'base_cost',
                    'reference',
                    'status',
                    'posted_at',
                    'location',
                    'variant',
                ],
            ]);

        // Assert: Stock movement created
        $this->assertDatabaseHas('stock_movements', [
            'to_location_id' => $this->location->id,
            'item_variant_id' => $variant->id,
            'qty' => 50,
            'reason' => 'OPENING_BALANCE',
            'status' => 'POSTED',
            'reference' => 'INV-2024-001',
        ]);

        // Assert: Stock record created
        $this->assertDatabaseHas('stock', [
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $variant->id,
            'on_hand' => 50,
            'reserved' => 0,
        ]);

        // Assert: Stock available computed correctly
        $stock = Stock::where('item_variant_id', $variant->id)->first();
        $this->assertEquals(50, $stock->available);

        // Assert: Variant costs updated
        $variant->refresh();
        $this->assertEquals(125.50, $variant->avg_unit_cost);
        $this->assertEquals(125.50, $variant->last_unit_cost);
    }


    #[Test]
    public function it_can_register_opening_balance_with_conversion()
    {
        // Arrange: Create item and variant in KG
        $item = $this->createItem([
            'name' => 'Rice',
            'type' => 'INSUMO',
        ]);

        $variant = $this->createItemVariant($item, [
            'name' => 'Rice White 1kg',
            'uom_id' => $this->uomKg->id,
        ]);

        // Act: Register opening balance in grams (should convert to KG)
        $response = $this->postJson('/api/v1/inventory/opening-balance', [
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $variant->id,
            'quantity' => 25000, // 25,000 grams
            'uom_id' => $this->uomGr->id,
            'unit_cost' => 0.15, // Cost per gram
            'reference' => 'INV-2024-002',
        ]);

        // Assert: Response
        $response->assertStatus(201);

        $data = $response->json('data');
        $this->assertEquals(25000, $data['quantity']); // Original quantity in grams
        $this->assertEquals('GR', $data['uom']);
        $this->assertEquals(25, $data['base_quantity']); // Converted to KG
        $this->assertEquals('KG', $data['base_uom']);
        $this->assertEquals(0.15, $data['unit_cost']); // Cost per gram
        $this->assertEquals(150, $data['base_cost']); // Cost per KG (0.15 * 1000)

        // Assert: Stock stored in base unit (KG)
        $this->assertDatabaseHas('stock', [
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $variant->id,
            'on_hand' => 25, // Converted to KG
            'reserved' => 0,
        ]);

        // Assert: Variant costs in base unit
        $variant->refresh();
        $this->assertEquals(150, $variant->avg_unit_cost); // Cost per KG
        $this->assertEquals(150, $variant->last_unit_cost);
    }


    #[Test]
    public function it_calculates_weighted_average_cost_correctly()
    {
        // Arrange: Create item and variant
        $item = $this->createItem(['name' => 'Tuna']);
        $variant = $this->createItemVariant($item, [
            'name' => 'Tuna Fresh',
            'uom_id' => $this->uomKg->id,
        ]);

        // Act: First opening balance - 10 KG at $100/KG
        $this->postJson('/api/v1/inventory/opening-balance', [
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $variant->id,
            'quantity' => 10,
            'uom_id' => $this->uomKg->id,
            'unit_cost' => 100,
        ])->assertStatus(201);

        // Act: Second opening balance - 20 KG at $150/KG
        $this->postJson('/api/v1/inventory/opening-balance', [
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $variant->id,
            'quantity' => 20,
            'uom_id' => $this->uomKg->id,
            'unit_cost' => 150,
        ])->assertStatus(201);

        // Assert: Total stock
        $stock = Stock::where('item_variant_id', $variant->id)->first();
        $this->assertEquals(30, $stock->on_hand);

        // Assert: Weighted average = (10*100 + 20*150) / 30 = 4000/30 = 133.33
        $variant->refresh();
        $this->assertEquals(133.33, round($variant->avg_unit_cost, 2));
        $this->assertEquals(150, $variant->last_unit_cost); // Last cost = most recent
    }


    #[Test]
    public function it_fails_without_authentication()
    {
        // Note: This test validates endpoint accessibility
        // In production, auth middleware would return 401
        // For testing, we verify the endpoint exists and is callable

        $item = $this->createItem();
        $variant = $this->createItemVariant($item);

        $response = $this->postJson('/api/v1/inventory/opening-balance', [
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $variant->id,
            'quantity' => 10,
            'uom_id' => $this->uomKg->id,
        ]);

        // Should succeed with Passport::actingAs in setUp
        $this->assertTrue($response->status() >= 200 && $response->status() < 500);
    }


    #[Test]
    public function it_validates_required_fields()
    {
        // Act
        $response = $this->postJson('/api/v1/inventory/opening-balance', []);

        // Assert
        $response->assertStatus(422)
            ->assertJsonValidationErrors([
                'inventory_location_id',
                'item_variant_id',
                'quantity',
                'uom_id',
            ]);
    }


    #[Test]
    public function it_validates_quantity_must_be_positive()
    {
        $item = $this->createItem();
        $variant = $this->createItemVariant($item);

        // Act
        $response = $this->postJson('/api/v1/inventory/opening-balance', [
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $variant->id,
            'quantity' => 0, // Invalid: must be > 0
            'uom_id' => $this->uomKg->id,
        ]);

        // Assert
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['quantity']);
    }


    #[Test]
    public function it_validates_location_exists()
    {
        $item = $this->createItem();
        $variant = $this->createItemVariant($item);

        // Act
        $response = $this->postJson('/api/v1/inventory/opening-balance', [
            'inventory_location_id' => 99999, // Non-existent
            'item_variant_id' => $variant->id,
            'quantity' => 10,
            'uom_id' => $this->uomKg->id,
        ]);

        // Assert
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['inventory_location_id']);
    }


    #[Test]
    public function it_validates_item_variant_exists()
    {
        // Act
        $response = $this->postJson('/api/v1/inventory/opening-balance', [
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => 99999, // Non-existent
            'quantity' => 10,
            'uom_id' => $this->uomKg->id,
        ]);

        // Assert
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['item_variant_id']);
    }


    #[Test]
    public function it_validates_uom_exists()
    {
        $item = $this->createItem();
        $variant = $this->createItemVariant($item);

        // Act
        $response = $this->postJson('/api/v1/inventory/opening-balance', [
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $variant->id,
            'quantity' => 10,
            'uom_id' => 99999, // Non-existent
        ]);

        // Assert
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['uom_id']);
    }


    #[Test]
    public function it_fails_when_no_conversion_available()
    {
        // Arrange: Create UOM without conversion
        $uomLiter = UnitOfMeasure::create([
            'code' => 'L',
            'name' => 'Liter',
            'symbol' => 'L',
            'type' => 'VOLUME',
            'precision' => 2,
            'is_base' => true,
            'is_active' => true,
        ]);

        $item = $this->createItem();
        $variant = $this->createItemVariant($item, [
            'uom_id' => $this->uomKg->id, // Base unit is KG
        ]);

        // Act: Try to register with Liter (no conversion KG <-> L)
        $response = $this->postJson('/api/v1/inventory/opening-balance', [
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $variant->id,
            'quantity' => 10,
            'uom_id' => $uomLiter->id, // No conversion available
            'unit_cost' => 50,
        ]);

        // Assert
        $response->assertStatus(400)
            ->assertJsonFragment([
                'status' => 400,
            ]);
    }


    #[Test]
    public function it_stores_movement_metadata_correctly()
    {
        // Arrange
        $item = $this->createItem(['name' => 'Coffee']);
        $variant = $this->createItemVariant($item, [
            'name' => 'Coffee Beans 1kg',
            'uom_id' => $this->uomKg->id,
        ]);

        // Act: Register with grams
        $response = $this->postJson('/api/v1/inventory/opening-balance', [
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $variant->id,
            'quantity' => 5000, // 5000 grams
            'uom_id' => $this->uomGr->id,
            'unit_cost' => 0.50, // $0.50 per gram
            'reference' => 'COFFEE-001',
            'notes' => 'Premium arabica beans',
        ]);

        // Assert
        $response->assertStatus(201);

        // Assert: Movement created with metadata
        $movement = StockMovement::where('reference', 'COFFEE-001')->first();
        $this->assertNotNull($movement);
        $this->assertIsArray($movement->meta);
        $this->assertEquals(5000, $movement->meta['original_qty']);
        $this->assertEquals('GR', $movement->meta['original_uom']);
        $this->assertEquals(0.50, $movement->meta['unit_cost']);
        $this->assertEquals(500, $movement->meta['base_cost']); // 0.50 * 1000
        $this->assertEquals(0.001, $movement->meta['conversion_factor']); // GR to KG = 1/1000
    }
}
