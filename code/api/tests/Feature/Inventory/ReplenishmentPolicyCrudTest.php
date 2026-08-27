<?php

namespace Tests\Feature\Inventory;

use App\Models\InventoryLocation;
use App\Models\User;
use App\Models\VariantLocationReplenishmentPolicy;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class ReplenishmentPolicyCrudTest extends InventoryTestCase
{
    private function secondLocation(): InventoryLocation
    {
        return InventoryLocation::create([
            'operating_unit_id' => $this->operatingUnit->id,
            'name' => 'Bar Fridge',
            'type' => InventoryLocation::TYPE_BAR,
            'priority' => 40,
            'is_active' => true,
        ]);
    }

    #[Test]
    public function it_upserts_a_new_policy_with_201(): void
    {
        $variant = $this->createItemVariant($this->createItem());

        $response = $this->putJson(
            "/api/v1/inventory-locations/{$this->location->public_id}/replenishment-policies/{$variant->public_id}",
            ['min_stock' => 10, 'max_stock' => 120, 'notes' => 'Weekly delivery']
        );

        $response->assertStatus(201)
            ->assertJsonPath('data.min_stock', fn ($v) => (float) $v === 10.0)
            ->assertJsonPath('data.max_stock', fn ($v) => (float) $v === 120.0)
            ->assertJsonPath('data.notes', 'Weekly delivery')
            ->assertJsonPath('data.is_configured', true)
            ->assertJsonPath('data.inventory_location_id', $this->location->public_id)
            ->assertJsonPath('data.item_variant_id', $variant->public_id);

        $this->assertDatabaseHas('variant_location_replenishment_policies', [
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $variant->id,
            'min_stock' => 10,
            'max_stock' => 120,
        ]);
    }

    #[Test]
    public function it_updates_an_existing_policy_with_200(): void
    {
        $variant = $this->createItemVariant($this->createItem());
        VariantLocationReplenishmentPolicy::create([
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $variant->id,
            'min_stock' => 5,
            'max_stock' => 50,
        ]);

        $response = $this->putJson(
            "/api/v1/inventory-locations/{$this->location->public_id}/replenishment-policies/{$variant->public_id}",
            ['min_stock' => 8, 'max_stock' => 80]
        );

        $response->assertStatus(200)->assertJsonPath('data.min_stock', fn ($v) => (float) $v === 8.0);

        $this->assertSame(1, VariantLocationReplenishmentPolicy::where('item_variant_id', $variant->id)->count());
        $this->assertDatabaseHas('variant_location_replenishment_policies', [
            'item_variant_id' => $variant->id, 'min_stock' => 8, 'max_stock' => 80,
        ]);
    }

    #[Test]
    public function the_same_variant_can_have_different_thresholds_at_two_locations(): void
    {
        $variant = $this->createItemVariant($this->createItem());
        $bar = $this->secondLocation();

        $this->putJson("/api/v1/inventory-locations/{$this->location->public_id}/replenishment-policies/{$variant->public_id}", ['min_stock' => 20, 'max_stock' => 200])
            ->assertStatus(201);
        $this->putJson("/api/v1/inventory-locations/{$bar->public_id}/replenishment-policies/{$variant->public_id}", ['min_stock' => 2, 'max_stock' => 12])
            ->assertStatus(201);

        $this->assertDatabaseHas('variant_location_replenishment_policies', [
            'inventory_location_id' => $this->location->id, 'item_variant_id' => $variant->id, 'min_stock' => 20,
        ]);
        $this->assertDatabaseHas('variant_location_replenishment_policies', [
            'inventory_location_id' => $bar->id, 'item_variant_id' => $variant->id, 'min_stock' => 2,
        ]);
    }

    #[Test]
    public function it_lists_policies_for_a_location(): void
    {
        $variantA = $this->createItemVariant($this->createItem(), ['code' => 'AAA-1']);
        $variantB = $this->createItemVariant($this->createItem(), ['code' => 'BBB-1']);
        $bar = $this->secondLocation();

        VariantLocationReplenishmentPolicy::create(['inventory_location_id' => $this->location->id, 'item_variant_id' => $variantA->id, 'min_stock' => 1, 'max_stock' => 10]);
        VariantLocationReplenishmentPolicy::create(['inventory_location_id' => $this->location->id, 'item_variant_id' => $variantB->id, 'min_stock' => 2, 'max_stock' => 20]);
        VariantLocationReplenishmentPolicy::create(['inventory_location_id' => $bar->id, 'item_variant_id' => $variantA->id, 'min_stock' => 9, 'max_stock' => 90]);

        $response = $this->getJson("/api/v1/inventory-locations/{$this->location->public_id}/replenishment-policies");

        $response->assertOk();
        $this->assertCount(2, $response->json('data'));
        $this->assertEqualsCanonicalizing(
            [$variantA->public_id, $variantB->public_id],
            collect($response->json('data'))->pluck('item_variant_id')->all()
        );
    }

    #[Test]
    public function it_returns_a_synthetic_unconfigured_policy_when_none_exists(): void
    {
        $variant = $this->createItemVariant($this->createItem());

        $response = $this->getJson("/api/v1/inventory-locations/{$this->location->public_id}/replenishment-policies/{$variant->public_id}");

        $response->assertOk()
            ->assertJsonPath('data.is_configured', false)
            ->assertJsonPath('data.id', null)
            ->assertJsonPath('data.min_stock', fn ($v) => (float) $v === 0.0)
            ->assertJsonPath('data.max_stock', fn ($v) => (float) $v === 0.0)
            ->assertJsonPath('data.item_variant_id', $variant->public_id);
    }

    #[Test]
    public function it_deletes_a_policy(): void
    {
        $variant = $this->createItemVariant($this->createItem());
        $policy = VariantLocationReplenishmentPolicy::create([
            'inventory_location_id' => $this->location->id, 'item_variant_id' => $variant->id, 'min_stock' => 5, 'max_stock' => 50,
        ]);

        $this->deleteJson("/api/v1/inventory-locations/{$this->location->public_id}/replenishment-policies/{$variant->public_id}")
            ->assertNoContent();

        $this->assertSoftDeleted('variant_location_replenishment_policies', ['id' => $policy->id]);
    }

    #[Test]
    public function it_rejects_a_ceiling_below_the_reorder_point(): void
    {
        $variant = $this->createItemVariant($this->createItem());

        $this->putJson("/api/v1/inventory-locations/{$this->location->public_id}/replenishment-policies/{$variant->public_id}", ['min_stock' => 100, 'max_stock' => 50])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['max_stock']);
    }

    #[Test]
    public function it_requires_min_and_max(): void
    {
        $variant = $this->createItemVariant($this->createItem());

        $this->putJson("/api/v1/inventory-locations/{$this->location->public_id}/replenishment-policies/{$variant->public_id}", [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['min_stock', 'max_stock']);
    }

    #[Test]
    public function it_requires_authentication(): void
    {
        $variant = $this->createItemVariant($this->createItem());
        app('auth')->forgetGuards();

        $this->putJson("/api/v1/inventory-locations/{$this->location->public_id}/replenishment-policies/{$variant->public_id}", ['min_stock' => 1, 'max_stock' => 2])
            ->assertStatus(401);
    }

    #[Test]
    public function it_forbids_writing_without_stock_manage_permission(): void
    {
        $variant = $this->createItemVariant($this->createItem());

        Permission::firstOrCreate(['name' => 'stock.view', 'guard_name' => 'api']);
        $readOnly = Role::firstOrCreate(['name' => 'stock-reader', 'guard_name' => 'api']);
        $readOnly->syncPermissions(['stock.view']);
        $viewer = User::factory()->create(['email' => 'viewer@sushigo.com']);
        $viewer->assignRole('stock-reader');
        Passport::actingAs($viewer);

        // read is allowed
        $this->getJson("/api/v1/inventory-locations/{$this->location->public_id}/replenishment-policies/{$variant->public_id}")
            ->assertOk();

        // write is not
        $this->putJson("/api/v1/inventory-locations/{$this->location->public_id}/replenishment-policies/{$variant->public_id}", ['min_stock' => 1, 'max_stock' => 2])
            ->assertStatus(403);
    }

    #[Test]
    public function it_404s_for_an_unknown_location_or_variant(): void
    {
        $variant = $this->createItemVariant($this->createItem());

        $this->getJson("/api/v1/inventory-locations/01JUNKNOWNLOCATION00000000/replenishment-policies/{$variant->public_id}")
            ->assertStatus(404);

        $this->getJson("/api/v1/inventory-locations/{$this->location->public_id}/replenishment-policies/01JUNKNOWNVARIANT00000000")
            ->assertStatus(404);
    }
}
