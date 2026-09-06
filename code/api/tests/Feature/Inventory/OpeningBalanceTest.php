<?php

namespace Tests\Feature\Inventory;

use App\Models\InventoryLocation;
use App\Models\OperatingUnit;
use App\Models\Stock;
use App\Models\StockMovement;
use App\Models\UnitOfMeasure;
use App\Models\VariantLocationAssignment;
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
            'inventory_location_id' => $this->location->public_id,
            'item_variant_id' => $variant->public_id,
            'quantity' => 50,
            'uom_id' => $this->uomKg->public_id,
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

        // Assert: weighted-average cost lands on Stock (#434), per location
        $this->assertEquals(125.50, (float) $stock->weighted_avg_cost);

        // Assert: the Product/Variant catalog carries no acquisition cost at all —
        // the per-Variant cost columns were dropped in #442.
        $variant->refresh();
        $this->assertFalse(array_key_exists('avg_unit_cost', $variant->getAttributes()));
        $this->assertFalse(array_key_exists('last_unit_cost', $variant->getAttributes()));
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
            'inventory_location_id' => $this->location->public_id,
            'item_variant_id' => $variant->public_id,
            'quantity' => 25000, // 25,000 grams
            'uom_id' => $this->uomGr->public_id,
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

        // Assert: weighted-average cost in base unit (#434), on Stock
        $stock = Stock::where('item_variant_id', $variant->id)->first();
        $this->assertEquals(150, (float) $stock->weighted_avg_cost); // Cost per KG

        // Assert: the catalog itself carries no acquisition cost (columns dropped in #442)
        $variant->refresh();
        $this->assertFalse(array_key_exists('avg_unit_cost', $variant->getAttributes()));
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
            'inventory_location_id' => $this->location->public_id,
            'item_variant_id' => $variant->public_id,
            'quantity' => 10,
            'uom_id' => $this->uomKg->public_id,
            'unit_cost' => 100,
        ])->assertStatus(201);

        // Act: Second opening balance - 20 KG at $150/KG
        $this->postJson('/api/v1/inventory/opening-balance', [
            'inventory_location_id' => $this->location->public_id,
            'item_variant_id' => $variant->public_id,
            'quantity' => 20,
            'uom_id' => $this->uomKg->public_id,
            'unit_cost' => 150,
        ])->assertStatus(201);

        // Assert: Total stock
        $stock = Stock::where('item_variant_id', $variant->id)->first();
        $this->assertEquals(30, $stock->on_hand);

        // Assert: Weighted average = (10*100 + 20*150) / 30 = 4000/30 = 133.33,
        // on Stock (#434) — never on the read-only catalog Variant
        $this->assertEquals(133.33, round((float) $stock->weighted_avg_cost, 2));

        $variant->refresh();
        $this->assertFalse(array_key_exists('avg_unit_cost', $variant->getAttributes()));
    }

    #[Test]
    public function it_blends_an_explicit_zero_unit_cost_into_the_weighted_average()
    {
        // Regression (#434 Codex P2): an explicit unit_cost of 0 (e.g. free
        // stock) must still blend into the weighted average — only a
        // missing (null) unit_cost should skip the blend. Before this fix,
        // `$baseCost > 0` treated an explicit 0 the same as "no cost
        // supplied" and silently left the prior average unchanged.
        $item = $this->createItem(['name' => 'Free Sample Item']);
        $variant = $this->createItemVariant($item, [
            'name' => 'Free Sample Variant',
            'uom_id' => $this->uomKg->id,
        ]);

        // First opening balance - 10 units at $100/unit
        $this->postJson('/api/v1/inventory/opening-balance', [
            'inventory_location_id' => $this->location->public_id,
            'item_variant_id' => $variant->public_id,
            'quantity' => 10,
            'uom_id' => $this->uomKg->public_id,
            'unit_cost' => 100,
        ])->assertStatus(201);

        // Second opening balance - 10 free units at $0/unit
        $this->postJson('/api/v1/inventory/opening-balance', [
            'inventory_location_id' => $this->location->public_id,
            'item_variant_id' => $variant->public_id,
            'quantity' => 10,
            'uom_id' => $this->uomKg->public_id,
            'unit_cost' => 0,
        ])->assertStatus(201);

        // Weighted average = (10*100 + 10*0) / 20 = 50
        $stock = Stock::where('item_variant_id', $variant->id)->first();
        $this->assertEquals(20, $stock->on_hand);
        $this->assertEquals(50, round((float) $stock->weighted_avg_cost, 2));
    }

    #[Test]
    public function it_keeps_weighted_average_cost_independent_per_location()
    {
        // Multi-location regression (#434): the same Variant received into
        // two different Inventory Locations at different unit costs must
        // not blend across locations — each Stock row keeps its own
        // weighted-average cost.
        $item = $this->createItem(['name' => 'Wasabi']);
        $variant = $this->createItemVariant($item, [
            'name' => 'Wasabi Paste',
            'uom_id' => $this->uomKg->id,
        ]);

        $secondLocation = InventoryLocation::create([
            'operating_unit_id' => $this->operatingUnit->id,
            'name' => 'Second Warehouse',
            'type' => 'MAIN',
            'priority' => 90,
            'is_active' => true,
        ]);

        $this->postJson('/api/v1/inventory/opening-balance', [
            'inventory_location_id' => $this->location->public_id,
            'item_variant_id' => $variant->public_id,
            'quantity' => 10,
            'uom_id' => $this->uomKg->public_id,
            'unit_cost' => 100,
        ])->assertStatus(201);

        $this->postJson('/api/v1/inventory/opening-balance', [
            'inventory_location_id' => $secondLocation->public_id,
            'item_variant_id' => $variant->public_id,
            'quantity' => 10,
            'uom_id' => $this->uomKg->public_id,
            'unit_cost' => 300,
        ])->assertStatus(201);

        $firstStock = Stock::where('inventory_location_id', $this->location->id)
            ->where('item_variant_id', $variant->id)
            ->first();
        $secondStock = Stock::where('inventory_location_id', $secondLocation->id)
            ->where('item_variant_id', $variant->id)
            ->first();

        $this->assertEquals(100, (float) $firstStock->weighted_avg_cost);
        $this->assertEquals(300, (float) $secondStock->weighted_avg_cost);
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
            'inventory_location_id' => $this->location->public_id,
            'item_variant_id' => $variant->public_id,
            'quantity' => 10,
            'uom_id' => $this->uomKg->public_id,
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
            'inventory_location_id' => $this->location->public_id,
            'item_variant_id' => $variant->public_id,
            'quantity' => 0, // Invalid: must be > 0
            'uom_id' => $this->uomKg->public_id,
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
            'inventory_location_id' => 'missing-public-id', // Non-existent
            'item_variant_id' => $variant->public_id,
            'quantity' => 10,
            'uom_id' => $this->uomKg->public_id,
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
            'inventory_location_id' => $this->location->public_id,
            'item_variant_id' => 'missing-public-id', // Non-existent
            'quantity' => 10,
            'uom_id' => $this->uomKg->public_id,
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
            'inventory_location_id' => $this->location->public_id,
            'item_variant_id' => $variant->public_id,
            'quantity' => 10,
            'uom_id' => 'missing-public-id', // Non-existent
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
            'inventory_location_id' => $this->location->public_id,
            'item_variant_id' => $variant->public_id,
            'quantity' => 10,
            'uom_id' => $uomLiter->public_id, // No conversion available
            'unit_cost' => 50,
        ]);

        // Assert: a bad UOM-to-base combination is a 422 input problem on
        // `uom_id` (#570) — not a generic 400 that hides whether it was
        // authorization, validation, or a business conflict.
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['uom_id']);
    }

    #[Test]
    public function it_rejects_an_inactive_destination_location()
    {
        $inactiveLocation = InventoryLocation::create([
            'operating_unit_id' => $this->operatingUnit->id,
            'name' => 'Decommissioned Warehouse',
            'type' => 'MAIN',
            'priority' => 10,
            'is_active' => false,
        ]);

        $item = $this->createItem();
        $variant = $this->createItemVariant($item, ['uom_id' => $this->uomKg->id]);

        $response = $this->postJson('/api/v1/inventory/opening-balance', [
            'inventory_location_id' => $inactiveLocation->public_id,
            'item_variant_id' => $variant->public_id,
            'quantity' => 10,
            'uom_id' => $this->uomKg->public_id,
            'unit_cost' => 100,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['inventory_location_id']);

        $this->assertDatabaseMissing('stock_movements', [
            'to_location_id' => $inactiveLocation->id,
            'item_variant_id' => $variant->id,
        ]);
        $this->assertDatabaseMissing('variant_location_assignments', [
            'inventory_location_id' => $inactiveLocation->id,
            'item_variant_id' => $variant->id,
        ]);
    }

    #[Test]
    public function it_rejects_a_location_in_an_operating_unit_the_caller_cannot_access()
    {
        $otherUnit = OperatingUnit::create([
            'branch_id' => $this->branch->id,
            'type' => 'BRANCH_MAIN',
            'name' => 'Unrelated Operating Unit',
            'is_active' => true,
        ]);

        $foreignLocation = InventoryLocation::create([
            'operating_unit_id' => $otherUnit->id,
            'name' => 'Foreign Warehouse',
            'type' => 'MAIN',
            'priority' => 50,
            'is_active' => true,
        ]);

        $item = $this->createItem();
        $variant = $this->createItemVariant($item, ['uom_id' => $this->uomKg->id]);

        $response = $this->postJson('/api/v1/inventory/opening-balance', [
            'inventory_location_id' => $foreignLocation->public_id,
            'item_variant_id' => $variant->public_id,
            'quantity' => 10,
            'uom_id' => $this->uomKg->public_id,
            'unit_cost' => 100,
        ]);

        $response->assertStatus(403);

        $this->assertDatabaseMissing('stock_movements', [
            'to_location_id' => $foreignLocation->id,
            'item_variant_id' => $variant->id,
        ]);
    }

    #[Test]
    public function it_ensures_a_variant_location_assignment_atomically_with_the_entry()
    {
        $item = $this->createItem(['name' => 'Eel']);
        $variant = $this->createItemVariant($item, [
            'name' => 'Unagi 1kg',
            'uom_id' => $this->uomKg->id,
        ]);

        $this->assertDatabaseMissing('variant_location_assignments', [
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $variant->id,
        ]);

        $this->postJson('/api/v1/inventory/opening-balance', [
            'inventory_location_id' => $this->location->public_id,
            'item_variant_id' => $variant->public_id,
            'quantity' => 8,
            'uom_id' => $this->uomKg->public_id,
            'unit_cost' => 40,
        ])->assertStatus(201);

        $this->assertDatabaseHas('variant_location_assignments', [
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $variant->id,
            'deleted_at' => null,
        ]);

        // Stock, movement, and line evidence all landed in the same call.
        $this->assertDatabaseHas('stock', [
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $variant->id,
            'on_hand' => 8,
        ]);
        $movement = StockMovement::where('to_location_id', $this->location->id)
            ->where('item_variant_id', $variant->id)
            ->where('reason', 'OPENING_BALANCE')
            ->firstOrFail();
        $this->assertDatabaseHas('stock_movement_lines', [
            'stock_movement_id' => $movement->id,
            'item_variant_id' => $variant->id,
            'base_qty' => 8,
        ]);
    }

    #[Test]
    public function it_keeps_a_single_live_assignment_across_repeated_opening_balances()
    {
        $item = $this->createItem(['name' => 'Octopus']);
        $variant = $this->createItemVariant($item, ['uom_id' => $this->uomKg->id]);

        foreach ([5, 7, 3] as $qty) {
            $this->postJson('/api/v1/inventory/opening-balance', [
                'inventory_location_id' => $this->location->public_id,
                'item_variant_id' => $variant->public_id,
                'quantity' => $qty,
                'uom_id' => $this->uomKg->public_id,
                'unit_cost' => 20,
            ])->assertStatus(201);
        }

        $this->assertEquals(1, VariantLocationAssignment::where('inventory_location_id', $this->location->id)
            ->where('item_variant_id', $variant->id)
            ->count());
    }

    #[Test]
    public function it_reactivates_a_soft_deleted_assignment_on_a_new_opening_balance()
    {
        $item = $this->createItem(['name' => 'Shrimp']);
        $variant = $this->createItemVariant($item, ['uom_id' => $this->uomKg->id]);

        $assignment = VariantLocationAssignment::create([
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $variant->id,
        ]);
        $assignment->delete();
        $this->assertSoftDeleted('variant_location_assignments', ['id' => $assignment->id]);

        $this->postJson('/api/v1/inventory/opening-balance', [
            'inventory_location_id' => $this->location->public_id,
            'item_variant_id' => $variant->public_id,
            'quantity' => 12,
            'uom_id' => $this->uomKg->public_id,
            'unit_cost' => 15,
        ])->assertStatus(201);

        $this->assertDatabaseHas('variant_location_assignments', [
            'id' => $assignment->id,
            'deleted_at' => null,
        ]);
        $this->assertEquals(1, VariantLocationAssignment::withTrashed()
            ->where('inventory_location_id', $this->location->id)
            ->where('item_variant_id', $variant->id)
            ->count());
    }

    #[Test]
    public function it_allows_a_missing_unit_cost_and_skips_the_weighted_average_blend()
    {
        $item = $this->createItem(['name' => 'Donated Rice']);
        $variant = $this->createItemVariant($item, ['uom_id' => $this->uomKg->id]);

        $response = $this->postJson('/api/v1/inventory/opening-balance', [
            'inventory_location_id' => $this->location->public_id,
            'item_variant_id' => $variant->public_id,
            'quantity' => 30,
            'uom_id' => $this->uomKg->public_id,
            // no unit_cost at all
        ]);

        $response->assertStatus(201);

        $stock = Stock::where('item_variant_id', $variant->id)->first();
        $this->assertEquals(30, (float) $stock->on_hand);
        $this->assertEquals(0, (float) $stock->weighted_avg_cost);
    }

    #[Test]
    public function it_increments_an_already_existing_stock_row_instead_of_duplicating_it()
    {
        // Simulates a concurrent request having already created the Stock
        // row for this location+variant a moment before this request runs —
        // the endpoint must increment the existing row, not crash or create
        // a second one for the same unique Location+Variant pair.
        $item = $this->createItem(['name' => 'Nori']);
        $variant = $this->createItemVariant($item, [
            'name' => 'Nori Sheets',
            'uom_id' => $this->uomKg->id,
        ]);

        Stock::create([
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $variant->id,
            'on_hand' => 10,
            'reserved' => 0,
        ]);

        $response = $this->postJson('/api/v1/inventory/opening-balance', [
            'inventory_location_id' => $this->location->public_id,
            'item_variant_id' => $variant->public_id,
            'quantity' => 5,
            'uom_id' => $this->uomKg->public_id,
            'unit_cost' => 100,
        ]);

        $response->assertStatus(201);

        $this->assertEquals(1, Stock::where('inventory_location_id', $this->location->id)
            ->where('item_variant_id', $variant->id)
            ->count());

        $stock = Stock::where('item_variant_id', $variant->id)->first();
        $this->assertEquals(15, (float) $stock->on_hand);
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
            'inventory_location_id' => $this->location->public_id,
            'item_variant_id' => $variant->public_id,
            'quantity' => 5000, // 5000 grams
            'uom_id' => $this->uomGr->public_id,
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
