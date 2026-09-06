<?php

namespace Tests\Feature\Inventory;

use App\Models\InventoryLocation;
use App\Models\Item;
use App\Models\ItemVariant;
use App\Models\OperatingUnit;
use App\Models\Stock;
use App\Models\User;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Role;

/**
 * Horizontal-authorization contract for the Inventory domain (#440): a user
 * with the global capability may still only read/mutate scoped data in an
 * Operating Unit they hold an active `operating_unit_users` membership in.
 *
 * $this->user (from InventoryTestCase) is an active member of
 * $this->operatingUnit ("unit A"). Every test here builds a second unit
 * ("unit B") the user is NOT a member of and asserts it stays invisible /
 * un-mutable through every documented bypass route: list results, the
 * operating_unit_id filter, direct public IDs, and stock movements.
 */
class OperatingUnitAccessTest extends InventoryTestCase
{
    private OperatingUnit $unitB;

    private InventoryLocation $locationB;

    private ItemVariant $sharedVariant;

    protected function setUp(): void
    {
        parent::setUp();

        $this->unitB = OperatingUnit::create([
            'branch_id' => $this->branch->id,
            'type' => OperatingUnit::TYPE_EVENT_TEMP,
            'name' => 'Foreign Event Unit',
            'is_active' => true,
        ]);

        $this->locationB = InventoryLocation::create([
            'operating_unit_id' => $this->unitB->id,
            'name' => 'Foreign Warehouse',
            'type' => 'MAIN',
            'priority' => 100,
            'is_active' => true,
        ]);

        $item = Item::create([
            'sku' => 'OU-ACCESS-001',
            'name' => 'Shared Item',
            'type' => 'INSUMO',
            'is_active' => true,
        ]);
        $this->sharedVariant = ItemVariant::create([
            'item_id' => $item->id,
            'uom_id' => $this->uomKg->id,
            'code' => 'OU-VAR-001',
            'name' => 'Shared Variant',
            'is_active' => true,
        ]);

        // Assigned + Stock for the same variant in BOTH units — the Existencias
        // endpoints (#571) spine on the managed assignment (#569), so the pair
        // must be assigned for its Stock to surface.
        $this->assignVariantToLocation($this->location, $this->sharedVariant);
        $this->assignVariantToLocation($this->locationB, $this->sharedVariant);

        Stock::create([
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $this->sharedVariant->id,
            'on_hand' => 100, 'reserved' => 0, 'weighted_avg_cost' => 10,
        ]);
        Stock::create([
            'inventory_location_id' => $this->locationB->id,
            'item_variant_id' => $this->sharedVariant->id,
            'on_hand' => 50, 'reserved' => 0, 'weighted_avg_cost' => 20,
        ]);
    }

    private function actingAsRole(string $roleName): User
    {
        Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);
        $user = User::factory()->create();
        $user->assignRole($roleName);
        $user->givePermissionTo([
            'inventory_locations.view', 'inventory_locations.manage',
            'stock.view', 'stock.manage',
        ]);
        Passport::actingAs($user);

        return $user;
    }

    // ── Inventory Locations ──────────────────────────────────────────────

    #[Test]
    public function location_list_only_returns_the_callers_units(): void
    {
        $ids = collect($this->getJson('/api/v1/inventory-locations')->assertOk()->json('data'))
            ->pluck('id');

        $this->assertContains($this->location->public_id, $ids);
        $this->assertNotContains($this->locationB->public_id, $ids);
    }

    #[Test]
    public function operating_unit_id_filter_cannot_widen_the_scope(): void
    {
        $response = $this->getJson("/api/v1/inventory-locations?operating_unit_id={$this->unitB->id}")
            ->assertOk();

        $this->assertEmpty($response->json('data'));
    }

    #[Test]
    public function showing_a_foreign_location_by_public_id_is_forbidden(): void
    {
        $this->getJson("/api/v1/inventory-locations/{$this->locationB->public_id}")
            ->assertForbidden();
    }

    #[Test]
    public function updating_or_deleting_a_foreign_location_is_forbidden(): void
    {
        $this->putJson("/api/v1/inventory-locations/{$this->locationB->public_id}", ['name' => 'Hijacked'])
            ->assertForbidden();
        $this->deleteJson("/api/v1/inventory-locations/{$this->locationB->public_id}")
            ->assertForbidden();

        $this->assertDatabaseHas('inventory_locations', [
            'id' => $this->locationB->id,
            'name' => 'Foreign Warehouse',
            'deleted_at' => null,
        ]);
    }

    #[Test]
    public function creating_a_location_in_a_foreign_unit_is_forbidden(): void
    {
        $this->postJson('/api/v1/inventory-locations', [
            'operating_unit_id' => $this->unitB->id,
            'name' => 'Sneaky Location',
            'type' => 'MAIN',
        ])->assertForbidden();

        $this->assertDatabaseMissing('inventory_locations', ['name' => 'Sneaky Location']);
    }

    #[Test]
    public function inactive_membership_loses_all_access(): void
    {
        $this->user->operatingUnits()->updateExistingPivot($this->operatingUnit->id, ['is_active' => false]);

        $this->getJson("/api/v1/inventory-locations/{$this->location->public_id}")->assertForbidden();
        $this->assertEmpty($this->getJson('/api/v1/inventory-locations')->assertOk()->json('data'));
        $this->getJson("/api/v1/stock/by-location/{$this->location->public_id}")->assertForbidden();
    }

    #[Test]
    public function super_admin_and_admin_bypass_operating_unit_scoping(): void
    {
        foreach (['super-admin', 'admin'] as $roleName) {
            $this->actingAsRole($roleName);

            $ids = collect($this->getJson('/api/v1/inventory-locations')->assertOk()->json('data'))
                ->pluck('id');
            $this->assertContains($this->locationB->public_id, $ids, "$roleName should see unit B");

            $this->getJson("/api/v1/inventory-locations/{$this->locationB->public_id}")->assertOk();
            $this->getJson("/api/v1/stock/by-location/{$this->locationB->public_id}")->assertOk();
        }
    }

    // ── Stock queries ───────────────────────────────────────────────────

    #[Test]
    public function stock_list_is_scoped_and_the_location_filter_cannot_bypass_it(): void
    {
        $unfiltered = $this->getJson('/api/v1/stock')->assertOk()->json('data');
        $locationIds = collect($unfiltered)->pluck('inventory_location.id')->unique();
        $this->assertContains($this->location->public_id, $locationIds);
        $this->assertNotContains($this->locationB->public_id, $locationIds);

        $filtered = $this->getJson("/api/v1/stock?inventory_location_id={$this->locationB->public_id}")
            ->assertOk()->json('data');
        $this->assertEmpty($filtered);
    }

    #[Test]
    public function stock_by_location_for_a_foreign_location_is_forbidden(): void
    {
        $this->getJson("/api/v1/stock/by-location/{$this->locationB->public_id}")
            ->assertForbidden();
    }

    #[Test]
    public function stock_by_variant_only_reports_the_callers_locations(): void
    {
        $response = $this->getJson("/api/v1/stock/by-variant/{$this->sharedVariant->public_id}")
            ->assertOk();

        $locationIds = collect($response->json('data.locations'))->pluck('inventory_location_id');
        $this->assertContains($this->location->public_id, $locationIds);
        $this->assertNotContains($this->locationB->public_id, $locationIds);
        $this->assertSame(1, $response->json('data.summary.total_locations'));
    }

    // ── Stock movements: both ends validated ────────────────────────────

    #[Test]
    public function opening_balance_into_a_foreign_location_is_forbidden(): void
    {
        $this->postJson('/api/v1/inventory/opening-balance', [
            'inventory_location_id' => $this->locationB->public_id,
            'item_variant_id' => $this->sharedVariant->public_id,
            'quantity' => 5,
            'uom_id' => $this->uomKg->public_id,
        ])->assertForbidden();
    }

    #[Test]
    public function stock_out_from_a_foreign_location_is_forbidden(): void
    {
        $this->postJson('/api/v1/inventory/stock-out', [
            'inventory_location_id' => $this->locationB->public_id,
            'item_variant_id' => $this->sharedVariant->public_id,
            'qty' => 1,
            'uom_id' => $this->uomKg->public_id,
            'reason' => 'CONSUMPTION',
        ])->assertForbidden();
    }

    #[Test]
    public function insider_can_still_operate_on_their_own_unit(): void
    {
        $this->postJson('/api/v1/inventory/opening-balance', [
            'inventory_location_id' => $this->location->public_id,
            'item_variant_id' => $this->sharedVariant->public_id,
            'quantity' => 5,
            'uom_id' => $this->uomKg->public_id,
        ])->assertCreated();

        $this->getJson("/api/v1/inventory-locations/{$this->location->public_id}")->assertOk();
        $this->getJson("/api/v1/stock/by-location/{$this->location->public_id}")->assertOk();
    }

    #[Test]
    public function a_nonexistent_location_still_fails_validation_not_authorization(): void
    {
        $this->postJson('/api/v1/inventory/opening-balance', [
            'inventory_location_id' => 'missing-public-id',
            'item_variant_id' => $this->sharedVariant->public_id,
            'quantity' => 5,
            'uom_id' => $this->uomKg->public_id,
        ])->assertStatus(422)->assertJsonValidationErrors(['inventory_location_id']);
    }

    // ── Per-location replenishment policies (#439 sub-resource) ──────────

    #[Test]
    public function replenishment_policy_endpoints_are_forbidden_for_a_foreign_location(): void
    {
        $base = "/api/v1/inventory-locations/{$this->locationB->public_id}/replenishment-policies";
        $variantId = $this->sharedVariant->public_id;

        $this->getJson($base)->assertForbidden();
        $this->getJson("$base/$variantId")->assertForbidden();
        $this->putJson("$base/$variantId", ['min_stock' => 1, 'max_stock' => 9])->assertForbidden();
        $this->deleteJson("$base/$variantId")->assertForbidden();

        $this->assertDatabaseMissing('variant_location_replenishment_policies', [
            'inventory_location_id' => $this->locationB->id,
            'item_variant_id' => $this->sharedVariant->id,
        ]);
    }

    #[Test]
    public function insider_can_manage_replenishment_policies_in_their_own_unit(): void
    {
        $base = "/api/v1/inventory-locations/{$this->location->public_id}/replenishment-policies";
        $variantId = $this->sharedVariant->public_id;

        $this->putJson("$base/$variantId", ['min_stock' => 2, 'max_stock' => 10])->assertCreated();
        $this->getJson($base)->assertOk();
        $this->getJson("$base/$variantId")->assertOk();
        $this->deleteJson("$base/$variantId")->assertNoContent();
    }
}
