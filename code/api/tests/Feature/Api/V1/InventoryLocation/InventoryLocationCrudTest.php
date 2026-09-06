<?php

namespace Tests\Feature\Api\V1\InventoryLocation;

use App\Models\Branch;
use App\Models\InventoryLocation;
use App\Models\Item;
use App\Models\ItemVariant;
use App\Models\OperatingUnit;
use App\Models\Stock;
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
        $this->assertContains($this->location->public_id, collect($response->json('data'))->pluck('id'));
        $this->assertNotContains($this->location->id, collect($response->json('data'))->pluck('id'));
    }

    #[Test]
    public function it_allows_listing_with_receipts_manage_permission_but_not_inventory_locations_view()
    {
        $this->user->removeRole('inventory-manager');
        $this->user->givePermissionTo('receipts.manage');

        $response = $this->getJson('/api/v1/inventory-locations');

        $response->assertOk();
        $this->assertContains($this->location->public_id, collect($response->json('data'))->pluck('id'));
    }

    #[Test]
    public function it_rejects_listing_without_inventory_locations_view_or_receipts_manage_permission()
    {
        $this->user->removeRole('inventory-manager');

        $this->getJson('/api/v1/inventory-locations')->assertForbidden();
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

        $response = $this->getJson("/api/v1/inventory-locations/{$location->public_id}");

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

        $response = $this->actingAs($this->user)->putJson("/api/v1/inventory-locations/{$location->public_id}", [
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

        $response = $this->actingAs($this->user)->putJson("/api/v1/inventory-locations/{$location->public_id}", [
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

        $response = $this->actingAs($this->user)->deleteJson("/api/v1/inventory-locations/{$location->public_id}");

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

        $response = $this->actingAs($this->user)->deleteJson("/api/v1/inventory-locations/{$location->public_id}");

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

    #[Test]
    public function it_serializes_can_receive_purchases_in_the_list()
    {
        // A location that never opted in serializes the capability as false — the
        // shared InventoryTestCase::$location is a receiving warehouse (#572), so
        // assert against a dedicated non-receiving one instead.
        $storage = InventoryLocation::factory()->create([
            'operating_unit_id' => $this->operatingUnit->id,
            'name' => 'Non-Receiving Storage',
            'can_receive_purchases' => false,
        ]);

        $response = $this->getJson('/api/v1/inventory-locations');

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'name', 'can_receive_purchases'],
                ],
            ]);

        $data = collect($response->json('data'));
        $this->assertFalse($data->firstWhere('id', $storage->public_id)['can_receive_purchases']);
        $this->assertTrue($data->firstWhere('id', $this->location->public_id)['can_receive_purchases']);
    }

    #[Test]
    public function it_creates_a_location_with_the_receiving_capability_opted_in()
    {
        $unit = OperatingUnit::where('type', 'BRANCH_MAIN')->first();

        $response = $this->actingAs($this->user)->postJson('/api/v1/inventory-locations', [
            'operating_unit_id' => $unit->id,
            'name' => 'Receiving Dock',
            'type' => 'MAIN',
            'can_receive_purchases' => true,
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'data' => [
                    'name' => 'Receiving Dock',
                    'can_receive_purchases' => true,
                ],
            ]);

        $this->assertDatabaseHas('inventory_locations', [
            'name' => 'Receiving Dock',
            'can_receive_purchases' => true,
        ]);
    }

    #[Test]
    public function it_defaults_can_receive_purchases_to_false_on_create()
    {
        $unit = OperatingUnit::where('type', 'BRANCH_MAIN')->first();

        $response = $this->actingAs($this->user)->postJson('/api/v1/inventory-locations', [
            'operating_unit_id' => $unit->id,
            'name' => 'Storage Only',
            'type' => 'MAIN',
        ]);

        $response->assertStatus(201)
            ->assertJson(['data' => ['can_receive_purchases' => false]]);

        $this->assertDatabaseHas('inventory_locations', [
            'name' => 'Storage Only',
            'can_receive_purchases' => false,
        ]);
    }

    #[Test]
    public function it_rejects_a_non_boolean_can_receive_purchases_on_create()
    {
        $unit = OperatingUnit::where('type', 'BRANCH_MAIN')->first();

        $response = $this->actingAs($this->user)->postJson('/api/v1/inventory-locations', [
            'operating_unit_id' => $unit->id,
            'name' => 'Bad Capability',
            'type' => 'MAIN',
            'can_receive_purchases' => 'not-a-boolean',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['can_receive_purchases']);
    }

    #[Test]
    public function it_rejects_a_null_can_receive_purchases_on_create()
    {
        $unit = OperatingUnit::where('type', 'BRANCH_MAIN')->first();

        $response = $this->actingAs($this->user)->postJson('/api/v1/inventory-locations', [
            'operating_unit_id' => $unit->id,
            'name' => 'Null Capability',
            'type' => 'MAIN',
            'can_receive_purchases' => null,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['can_receive_purchases']);
    }

    #[Test]
    public function it_rejects_a_null_can_receive_purchases_on_update()
    {
        $location = InventoryLocation::factory()->create([
            'operating_unit_id' => $this->operatingUnit->id,
            'type' => 'MAIN',
            'can_receive_purchases' => true,
        ]);

        $response = $this->actingAs($this->user)->putJson("/api/v1/inventory-locations/{$location->public_id}", [
            'can_receive_purchases' => null,
        ]);

        // Must be a 422, not a 500 from writing NULL into the NOT NULL column.
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['can_receive_purchases']);

        $this->assertDatabaseHas('inventory_locations', [
            'id' => $location->id,
            'can_receive_purchases' => true,
        ]);
    }

    #[Test]
    public function it_updates_the_receiving_capability_without_touching_type()
    {
        $location = InventoryLocation::factory()->create([
            'operating_unit_id' => $this->operatingUnit->id,
            'type' => 'MAIN',
            'can_receive_purchases' => false,
        ]);

        $response = $this->actingAs($this->user)->putJson("/api/v1/inventory-locations/{$location->public_id}", [
            'can_receive_purchases' => true,
        ]);

        $response->assertOk()
            ->assertJson([
                'data' => [
                    'type' => 'MAIN',
                    'can_receive_purchases' => true,
                ],
            ]);

        $this->assertDatabaseHas('inventory_locations', [
            'id' => $location->id,
            'can_receive_purchases' => true,
        ]);
    }

    #[Test]
    public function it_filters_locations_by_can_receive_purchases_true_and_false()
    {
        $receiving = InventoryLocation::factory()->create([
            'operating_unit_id' => $this->operatingUnit->id,
            'name' => 'Receiving Capable',
            'can_receive_purchases' => true,
        ]);
        $storage = InventoryLocation::factory()->create([
            'operating_unit_id' => $this->operatingUnit->id,
            'name' => 'Storage Only',
            'can_receive_purchases' => false,
        ]);

        $onlyReceiving = $this->getJson('/api/v1/inventory-locations?can_receive_purchases=1');
        $onlyReceiving->assertOk();
        $receivingIds = collect($onlyReceiving->json('data'))->pluck('id');
        $this->assertContains($receiving->public_id, $receivingIds);
        $this->assertNotContains($storage->public_id, $receivingIds);
        foreach ($onlyReceiving->json('data') as $row) {
            $this->assertTrue($row['can_receive_purchases']);
        }

        $onlyStorage = $this->getJson('/api/v1/inventory-locations?can_receive_purchases=0');
        $onlyStorage->assertOk();
        $storageIds = collect($onlyStorage->json('data'))->pluck('id');
        $this->assertContains($storage->public_id, $storageIds);
        $this->assertNotContains($receiving->public_id, $storageIds);
        foreach ($onlyStorage->json('data') as $row) {
            $this->assertFalse($row['can_receive_purchases']);
        }
    }

    #[Test]
    public function the_can_receive_purchases_filter_never_escapes_operating_unit_scope()
    {
        // A receiving-capable location in an Operating Unit the user has no
        // membership in must stay invisible even when explicitly filtered for.
        $this->user->removeRole('inventory-manager');
        $this->user->givePermissionTo('inventory_locations.view');

        $foreignBranch = Branch::create([
            'code' => 'FGN', 'name' => 'Foreign Branch', 'address' => 'x', 'city' => 'x',
            'state' => 'x', 'country' => 'MX', 'postal_code' => '00000', 'is_active' => true,
        ]);
        $foreignUnit = OperatingUnit::create([
            'branch_id' => $foreignBranch->id,
            'type' => 'BRANCH_MAIN',
            'name' => 'Foreign Unit',
            'is_active' => true,
        ]);
        $foreignReceiving = InventoryLocation::factory()->create([
            'operating_unit_id' => $foreignUnit->id,
            'can_receive_purchases' => true,
        ]);

        $response = $this->getJson('/api/v1/inventory-locations?can_receive_purchases=1');

        $response->assertOk();
        $this->assertNotContains(
            $foreignReceiving->public_id,
            collect($response->json('data'))->pluck('id')
        );
    }
}
