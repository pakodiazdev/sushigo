<?php

namespace Tests\Feature\Api\V1\InventoryLocation;

use App\Models\Branch;
use App\Models\OperatingUnit;
use App\Models\InventoryLocation;
use App\Models\Stock;
use App\Models\ItemVariant;
use App\Models\Item;
use App\Models\UnitOfMeasure;
use PHPUnit\Framework\Attributes\Test;
use Tests\Feature\Inventory\InventoryTestCase;

class InventoryLocationCrudTest extends InventoryTestCase
{

    #[Test]
    public function it_lists_inventory_locations()
    {
        $response = $this->getJson('/api/v1/inventory-locations');

        $response->assertOk()
            ->assertJsonStructure([
                'status',
                'data' => [
                    '*' => ['id', 'operating_unit_id', 'name', 'type', 'priority', 'is_primary', 'is_active'],
                ],
                'meta' => [
                    'current_page',
                    'total',
                ],
            ]);

        // Should have at least 1 location from test setup
        $this->assertGreaterThanOrEqual(1, $response->json('meta.total'));
    }


    #[Test]
    public function it_filters_locations_by_operating_unit()
    {
        $branchMainUnit = OperatingUnit::where('type', 'BRANCH_MAIN')->first();

        $response = $this->getJson("/api/v1/inventory-locations?operating_unit_id={$branchMainUnit->id}");

        $response->assertOk();

        $locations = $response->json('data');
        foreach ($locations as $location) {
            $this->assertEquals($branchMainUnit->id, $location['operating_unit_id']);
        }
    }


    #[Test]
    public function it_filters_locations_by_type()
    {
        $response = $this->getJson('/api/v1/inventory-locations?type=MAIN');

        $response->assertOk();

        $locations = $response->json('data');
        foreach ($locations as $location) {
            $this->assertEquals('MAIN', $location['type']);
        }

        // Should have 1 MAIN location from seeder
        $this->assertGreaterThanOrEqual(1, count($locations));
    }


    #[Test]
    public function it_filters_locations_by_is_active()
    {
        $response = $this->getJson('/api/v1/inventory-locations?is_active=1');

        $response->assertOk();

        $locations = $response->json('data');
        foreach ($locations as $location) {
            $this->assertTrue($location['is_active']);
        }
    }


    #[Test]
    public function it_creates_inventory_location()
    {
        $centralUnit = OperatingUnit::where('type', 'BRANCH_MAIN')->first();

        $response = $this->actingAs($this->user)->postJson('/api/v1/inventory-locations', [
            'operating_unit_id' => $centralUnit->id,
            'name' => 'Test Location',
            'type' => 'TEMP',
            'priority' => 50,
            'is_primary' => false,
            'is_active' => true,
            'notes' => 'Test location for unit testing',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'status',
                'data' => [
                    'id',
                    'operating_unit_id',
                    'name',
                    'type',
                    'priority',
                    'is_primary',
                    'is_active',
                    'notes',
                    'operating_unit' => ['id', 'name', 'type'],
                    'created_at',
                ],
            ])
            ->assertJson([
                'status' => 201,
                'data' => [
                    'name' => 'Test Location',
                    'type' => 'TEMP',
                    'priority' => 50,
                ],
            ]);

        $this->assertDatabaseHas('inventory_locations', [
            'name' => 'Test Location',
            'type' => 'TEMP',
            'operating_unit_id' => $centralUnit->id,
        ]);
    }


    #[Test]
    public function it_uses_default_values_when_creating_location()
    {
        $centralUnit = OperatingUnit::where('type', 'BRANCH_MAIN')->first();

        $response = $this->actingAs($this->user)->postJson('/api/v1/inventory-locations', [
            'operating_unit_id' => $centralUnit->id,
            'name' => 'Minimal Location',
            'type' => 'KITCHEN',
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'data' => [
                    'priority' => 100,
                    'is_primary' => false,
                    'is_active' => true,
                ],
            ]);
    }


    #[Test]
    public function it_validates_required_fields_when_creating()
    {
        $response = $this->actingAs($this->user)->postJson('/api/v1/inventory-locations', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['operating_unit_id', 'name', 'type']);
    }


    #[Test]
    public function it_validates_operating_unit_exists_when_creating()
    {
        $response = $this->actingAs($this->user)->postJson('/api/v1/inventory-locations', [
            'operating_unit_id' => 99999,
            'name' => 'Test Location',
            'type' => 'MAIN',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['operating_unit_id']);
    }


    #[Test]
    public function it_validates_location_type_enum()
    {
        $centralUnit = OperatingUnit::where('type', 'BRANCH_MAIN')->first();

        $response = $this->actingAs($this->user)->postJson('/api/v1/inventory-locations', [
            'operating_unit_id' => $centralUnit->id,
            'name' => 'Test Location',
            'type' => 'INVALID_TYPE',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['type']);
    }


    #[Test]
    public function it_shows_inventory_location_with_stock_summary()
    {
        $location = InventoryLocation::first();

        $response = $this->getJson("/api/v1/inventory-locations/{$location->id}");

        $response->assertOk()
            ->assertJsonStructure([
                'status',
                'data' => [
                    'id',
                    'name',
                    'type',
                    'operating_unit' => ['id', 'name', 'type', 'branch'],
                    'stock_summary' => [
                        'variant_count',
                        'total_on_hand',
                        'total_reserved',
                        'total_available',
                    ],
                    'created_at',
                    'updated_at',
                ],
            ]);
    }


    #[Test]
    public function it_updates_inventory_location()
    {
        $location = InventoryLocation::first();

        $response = $this->actingAs($this->user)->putJson("/api/v1/inventory-locations/{$location->id}", [
            'name' => 'Updated Location Name',
            'priority' => 75,
            'is_active' => false,
            'notes' => 'Updated notes',
        ]);

        $response->assertOk()
            ->assertJson([
                'data' => [
                    'name' => 'Updated Location Name',
                    'priority' => 75,
                    'is_active' => false,
                    'notes' => 'Updated notes',
                ],
            ]);

        $this->assertDatabaseHas('inventory_locations', [
            'id' => $location->id,
            'name' => 'Updated Location Name',
            'priority' => 75,
            'is_active' => false,
        ]);
    }


    #[Test]
    public function it_updates_only_provided_fields()
    {
        $location = InventoryLocation::first();
        $originalName = $location->name;

        $response = $this->actingAs($this->user)->putJson("/api/v1/inventory-locations/{$location->id}", [
            'priority' => 80,
        ]);

        $response->assertOk()
            ->assertJson([
                'data' => [
                    'name' => $originalName, // Should remain unchanged
                    'priority' => 80,
                ],
            ]);
    }


    #[Test]
    public function it_deletes_inventory_location_without_stock()
    {
        $location = InventoryLocation::factory()->create([
            'operating_unit_id' => OperatingUnit::first()->id,
        ]);

        $response = $this->actingAs($this->user)->deleteJson("/api/v1/inventory-locations/{$location->id}");

        $response->assertOk()
            ->assertJson([
                'data' => [
                    'message' => 'Inventory location deleted successfully',
                ],
            ]);

        $this->assertSoftDeleted('inventory_locations', [
            'id' => $location->id,
        ]);
    }


    #[Test]
    public function it_prevents_deleting_location_with_stock()
    {
        // Create location with stock
        $location = InventoryLocation::first();

        // Create item and variant
        $uom = UnitOfMeasure::where('code', 'KG')->first();
        $item = Item::factory()->create();
        $variant = ItemVariant::factory()->create([
            'item_id' => $item->id,
            'uom_id' => $uom->id,
        ]);

        // Add stock to location
        Stock::create([
            'inventory_location_id' => $location->id,
            'item_variant_id' => $variant->id,
            'on_hand' => 10.0,
            'reserved' => 0.0,
            'weighted_avg_cost' => 50.0,
        ]);

        $response = $this->actingAs($this->user)->deleteJson("/api/v1/inventory-locations/{$location->id}");

        $response->assertStatus(409)
            ->assertJson([
                'status' => 409,
                'message' => 'Cannot delete location that has stock on hand. Move or consume stock first.',
            ]);

        $this->assertDatabaseHas('inventory_locations', [
            'id' => $location->id,
        ]);
    }


    #[Test]
    public function it_returns_404_when_location_not_found()
    {
        $response = $this->getJson('/api/v1/inventory-locations/99999');

        $response->assertStatus(404);
    }
}
