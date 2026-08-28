<?php

namespace Tests\Unit\Policies;

use App\Models\Branch;
use App\Models\InventoryLocation;
use App\Models\OperatingUnit;
use App\Models\User;
use App\Policies\InventoryLocationPolicy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class InventoryLocationPolicyTest extends TestCase
{
    use RefreshDatabase;

    private InventoryLocationPolicy $policy;

    private OperatingUnit $operatingUnit;

    protected function setUp(): void
    {
        parent::setUp();

        $this->policy = new InventoryLocationPolicy;

        foreach (['inventory_locations.view', 'inventory_locations.manage'] as $name) {
            Permission::create(['name' => $name, 'guard_name' => 'api']);
        }

        $branch = Branch::create([
            'code' => 'TEST',
            'name' => 'Test Branch',
            'address' => '123 Test St',
            'city' => 'Test City',
            'state' => 'TS',
            'country' => 'MX',
            'postal_code' => '12345',
            'is_active' => true,
        ]);

        $this->operatingUnit = OperatingUnit::create([
            'branch_id' => $branch->id,
            'type' => OperatingUnit::TYPE_BRANCH_MAIN,
            'name' => 'Test Main Inventory',
            'is_active' => true,
        ]);
    }

    /**
     * A user holding the given permissions AND an active membership in
     * $this->operatingUnit — the default for the permission-focused cases,
     * since per-instance abilities now also require operating-unit membership
     * (#440).
     */
    private function userWith(string ...$permissions): User
    {
        $user = $this->bareUserWith(...$permissions);
        $user->operatingUnits()->attach($this->operatingUnit->id, [
            'assignment_role' => 'INVENTORY',
            'is_active' => true,
        ]);

        return $user;
    }

    private function bareUserWith(string ...$permissions): User
    {
        $user = User::factory()->create();
        $user->givePermissionTo($permissions);
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        return $user;
    }

    private function location(): InventoryLocation
    {
        return InventoryLocation::factory()->create([
            'operating_unit_id' => $this->operatingUnit->id,
        ]);
    }

    #[Test]
    public function guest_cannot_view_any(): void
    {
        $this->assertFalse($this->policy->viewAny(null));
    }

    #[Test]
    public function user_without_view_permission_cannot_view_any(): void
    {
        $this->assertFalse($this->policy->viewAny($this->userWith()));
    }

    #[Test]
    public function user_with_view_permission_can_view_any(): void
    {
        $this->assertTrue($this->policy->viewAny($this->userWith('inventory_locations.view')));
    }

    #[Test]
    public function guest_cannot_view(): void
    {
        $this->assertFalse($this->policy->view(null, $this->location()));
    }

    #[Test]
    public function user_without_view_permission_cannot_view(): void
    {
        $this->assertFalse($this->policy->view($this->userWith(), $this->location()));
    }

    #[Test]
    public function user_with_view_permission_can_view(): void
    {
        $this->assertTrue($this->policy->view($this->userWith('inventory_locations.view'), $this->location()));
    }

    #[Test]
    public function guest_cannot_create(): void
    {
        $this->assertFalse($this->policy->create(null));
    }

    #[Test]
    public function user_without_manage_permission_cannot_create(): void
    {
        $this->assertFalse($this->policy->create($this->userWith()));
    }

    #[Test]
    public function user_with_neighboring_view_permission_cannot_create(): void
    {
        $this->assertFalse($this->policy->create($this->userWith('inventory_locations.view')));
    }

    #[Test]
    public function user_with_manage_permission_can_create(): void
    {
        $this->assertTrue($this->policy->create($this->userWith('inventory_locations.manage')));
    }

    #[Test]
    public function guest_cannot_update(): void
    {
        $this->assertFalse($this->policy->update(null, $this->location()));
    }

    #[Test]
    public function user_without_manage_permission_cannot_update(): void
    {
        $this->assertFalse($this->policy->update($this->userWith(), $this->location()));
    }

    #[Test]
    public function user_with_neighboring_view_permission_cannot_update(): void
    {
        $this->assertFalse($this->policy->update($this->userWith('inventory_locations.view'), $this->location()));
    }

    #[Test]
    public function user_with_manage_permission_can_update(): void
    {
        $this->assertTrue($this->policy->update($this->userWith('inventory_locations.manage'), $this->location()));
    }

    #[Test]
    public function guest_cannot_delete(): void
    {
        $this->assertFalse($this->policy->delete(null, $this->location()));
    }

    #[Test]
    public function user_without_manage_permission_cannot_delete(): void
    {
        $this->assertFalse($this->policy->delete($this->userWith(), $this->location()));
    }

    #[Test]
    public function user_with_neighboring_view_permission_cannot_delete(): void
    {
        $this->assertFalse($this->policy->delete($this->userWith('inventory_locations.view'), $this->location()));
    }

    #[Test]
    public function user_with_manage_permission_can_delete(): void
    {
        $this->assertTrue($this->policy->delete($this->userWith('inventory_locations.manage'), $this->location()));
    }

    #[Test]
    public function guest_cannot_restore(): void
    {
        $this->assertFalse($this->policy->restore(null, $this->location()));
    }

    #[Test]
    public function user_without_manage_permission_cannot_restore(): void
    {
        $this->assertFalse($this->policy->restore($this->userWith(), $this->location()));
    }

    #[Test]
    public function user_with_manage_permission_can_restore(): void
    {
        $this->assertTrue($this->policy->restore($this->userWith('inventory_locations.manage'), $this->location()));
    }

    #[Test]
    public function guest_cannot_force_delete(): void
    {
        $this->assertFalse($this->policy->forceDelete(null, $this->location()));
    }

    #[Test]
    public function user_without_manage_permission_cannot_force_delete(): void
    {
        $this->assertFalse($this->policy->forceDelete($this->userWith(), $this->location()));
    }

    #[Test]
    public function user_with_manage_permission_can_force_delete(): void
    {
        $this->assertTrue($this->policy->forceDelete($this->userWith('inventory_locations.manage'), $this->location()));
    }

    // ── Horizontal authorization: operating-unit membership (#440) ─────────

    private function otherUnitLocation(): InventoryLocation
    {
        $otherUnit = OperatingUnit::create([
            'branch_id' => $this->operatingUnit->branch_id,
            'type' => OperatingUnit::TYPE_EVENT_TEMP,
            'name' => 'Other Unit',
            'is_active' => true,
        ]);

        return InventoryLocation::factory()->create(['operating_unit_id' => $otherUnit->id]);
    }

    #[Test]
    public function permitted_user_cannot_view_a_location_in_a_unit_they_do_not_belong_to(): void
    {
        $user = $this->userWith('inventory_locations.view');

        $this->assertFalse($this->policy->view($user, $this->otherUnitLocation()));
    }

    #[Test]
    public function permitted_user_cannot_update_or_delete_a_location_in_a_foreign_unit(): void
    {
        $user = $this->userWith('inventory_locations.manage');
        $foreign = $this->otherUnitLocation();

        $this->assertFalse($this->policy->update($user, $foreign));
        $this->assertFalse($this->policy->delete($user, $foreign));
        $this->assertFalse($this->policy->restore($user, $foreign));
        $this->assertFalse($this->policy->forceDelete($user, $foreign));
    }

    #[Test]
    public function inactive_membership_does_not_grant_per_instance_access(): void
    {
        $user = $this->bareUserWith('inventory_locations.view', 'inventory_locations.manage');
        $user->operatingUnits()->attach($this->operatingUnit->id, [
            'assignment_role' => 'INVENTORY',
            'is_active' => false,
        ]);

        $this->assertFalse($this->policy->view($user, $this->location()));
        $this->assertFalse($this->policy->update($user, $this->location()));
    }

    #[Test]
    public function class_string_checks_stay_permission_only(): void
    {
        // No instance → no membership dimension to check (a Gate::allows(...,
        // InventoryLocation::class) call). Preserved from #400.
        $user = $this->bareUserWith('inventory_locations.view', 'inventory_locations.manage');

        $this->assertTrue($this->policy->view($user));
        $this->assertTrue($this->policy->update($user));
        $this->assertTrue($this->policy->delete($user));
    }

    #[Test]
    public function admin_and_super_admin_bypass_membership_for_any_location(): void
    {
        foreach (['admin', 'super-admin'] as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);
            $user = User::factory()->create();
            $user->assignRole($roleName);
            $user->givePermissionTo('inventory_locations.view', 'inventory_locations.manage');
            app()[PermissionRegistrar::class]->forgetCachedPermissions();

            $foreign = $this->otherUnitLocation();

            $this->assertTrue($this->policy->view($user, $foreign), "$roleName view");
            $this->assertTrue($this->policy->update($user, $foreign), "$roleName update");
            $this->assertTrue($this->policy->delete($user, $foreign), "$roleName delete");
        }
    }
}
