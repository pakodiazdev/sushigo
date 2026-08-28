<?php

namespace Tests\Unit\Support\Access;

use App\Models\Branch;
use App\Models\InventoryLocation;
use App\Models\Item;
use App\Models\ItemVariant;
use App\Models\OperatingUnit;
use App\Models\Stock;
use App\Models\UnitOfMeasure;
use App\Models\User;
use App\Support\Access\OperatingUnitScope;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class OperatingUnitScopeTest extends TestCase
{
    use RefreshDatabase;

    private OperatingUnitScope $scope;

    private OperatingUnit $unitA;

    private OperatingUnit $unitB;

    private InventoryLocation $locationA;

    private InventoryLocation $locationB;

    protected function setUp(): void
    {
        parent::setUp();

        $this->scope = new OperatingUnitScope;

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

        $this->unitA = OperatingUnit::create([
            'branch_id' => $branch->id,
            'type' => OperatingUnit::TYPE_BRANCH_MAIN,
            'name' => 'Unit A',
            'is_active' => true,
        ]);

        $this->unitB = OperatingUnit::create([
            'branch_id' => $branch->id,
            'type' => OperatingUnit::TYPE_EVENT_TEMP,
            'name' => 'Unit B',
            'is_active' => true,
        ]);

        $this->locationA = InventoryLocation::create([
            'operating_unit_id' => $this->unitA->id,
            'name' => 'Warehouse A',
            'type' => InventoryLocation::TYPE_MAIN,
            'is_active' => true,
        ]);

        $this->locationB = InventoryLocation::create([
            'operating_unit_id' => $this->unitB->id,
            'name' => 'Warehouse B',
            'type' => InventoryLocation::TYPE_MAIN,
            'is_active' => true,
        ]);
    }

    private function member(OperatingUnit $unit, bool $active = true): User
    {
        $user = User::factory()->create();
        $user->operatingUnits()->attach($unit->id, [
            'assignment_role' => 'INVENTORY',
            'is_active' => $active,
        ]);

        return $user;
    }

    private function withRole(string $role): User
    {
        Role::firstOrCreate(['name' => $role, 'guard_name' => 'api']);
        $user = User::factory()->create();
        $user->assignRole($role);

        return $user;
    }

    #[Test]
    public function active_member_can_access_only_their_unit(): void
    {
        $user = $this->member($this->unitA);

        $this->assertTrue($this->scope->canAccessOperatingUnit($user, $this->unitA->id));
        $this->assertFalse($this->scope->canAccessOperatingUnit($user, $this->unitB->id));
        $this->assertTrue($this->scope->canAccessLocation($user, $this->locationA));
        $this->assertFalse($this->scope->canAccessLocation($user, $this->locationB));
    }

    #[Test]
    public function inactive_membership_grants_no_access(): void
    {
        $user = $this->member($this->unitA, active: false);

        $this->assertFalse($this->scope->canAccessOperatingUnit($user, $this->unitA->id));
        $this->assertFalse($this->scope->canAccessLocation($user, $this->locationA));
        $this->assertEqualsCanonicalizing([], $this->scope->accessibleOperatingUnitIds($user)->all());
    }

    #[Test]
    public function user_with_no_membership_has_empty_scope(): void
    {
        $user = User::factory()->create();

        $this->assertFalse($this->scope->hasUnrestrictedAccess($user));
        $this->assertEqualsCanonicalizing([], $this->scope->accessibleOperatingUnitIds($user)->all());
        $this->assertFalse($this->scope->canAccessLocation($user, $this->locationA));
    }

    #[Test]
    public function super_admin_and_admin_bypass_membership(): void
    {
        foreach (['super-admin', 'admin'] as $role) {
            $user = $this->withRole($role);

            $this->assertTrue($this->scope->hasUnrestrictedAccess($user), "$role should bypass");
            $this->assertTrue($this->scope->canAccessOperatingUnit($user, $this->unitB->id));
            $this->assertTrue($this->scope->canAccessLocation($user, $this->locationB));
            $this->assertEqualsCanonicalizing(
                [$this->unitA->id, $this->unitB->id],
                $this->scope->accessibleOperatingUnitIds($user)->all()
            );
        }
    }

    #[Test]
    public function accessible_ids_lists_every_active_membership(): void
    {
        $user = $this->member($this->unitA);
        $user->operatingUnits()->attach($this->unitB->id, [
            'assignment_role' => 'MANAGER',
            'is_active' => true,
        ]);

        $this->assertEqualsCanonicalizing(
            [$this->unitA->id, $this->unitB->id],
            $this->scope->accessibleOperatingUnitIds($user)->all()
        );
    }

    #[Test]
    public function can_access_location_resolves_by_public_id_and_primary_key(): void
    {
        $user = $this->member($this->unitA);

        $this->assertTrue($this->scope->canAccessLocation($user, $this->locationA->public_id));
        $this->assertTrue($this->scope->canAccessLocation($user, $this->locationA->id));
        $this->assertFalse($this->scope->canAccessLocation($user, $this->locationB->public_id));
        $this->assertFalse($this->scope->canAccessLocation($user, 999999));
        $this->assertFalse($this->scope->canAccessLocation($user, null));
    }

    #[Test]
    public function assert_can_access_location_throws_for_non_member(): void
    {
        $user = $this->member($this->unitA);

        $this->expectException(AuthorizationException::class);

        $this->scope->assertCanAccessLocation($user, $this->locationB);
    }

    #[Test]
    public function assert_can_access_location_passes_for_member(): void
    {
        $user = $this->member($this->unitA);

        $this->scope->assertCanAccessLocation($user, $this->locationA);

        $this->expectNotToPerformAssertions();
    }

    #[Test]
    public function constrain_locations_filters_to_accessible_units(): void
    {
        $user = $this->member($this->unitA);

        $ids = $this->scope->constrainLocations(InventoryLocation::query(), $user)->pluck('id');

        $this->assertContains($this->locationA->id, $ids);
        $this->assertNotContains($this->locationB->id, $ids);
    }

    #[Test]
    public function constrain_stock_filters_to_accessible_units(): void
    {
        $uom = UnitOfMeasure::create([
            'code' => 'KG', 'name' => 'Kilogram', 'symbol' => 'kg', 'type' => 'WEIGHT',
            'precision' => 3, 'is_base' => true, 'is_active' => true,
        ]);
        $item = Item::create([
            'sku' => 'STK-001', 'name' => 'Stocked Item', 'type' => 'INSUMO', 'is_active' => true,
        ]);
        $variant = ItemVariant::create([
            'item_id' => $item->id, 'uom_id' => $uom->id, 'code' => 'VAR-STK-001',
            'name' => 'Variant', 'is_active' => true,
        ]);

        $stockA = Stock::create([
            'inventory_location_id' => $this->locationA->id,
            'item_variant_id' => $variant->id,
            'on_hand' => 10,
            'reserved' => 0,
            'weighted_avg_cost' => 1,
        ]);
        $stockB = Stock::create([
            'inventory_location_id' => $this->locationB->id,
            'item_variant_id' => $variant->id,
            'on_hand' => 5,
            'reserved' => 0,
            'weighted_avg_cost' => 1,
        ]);

        $memberIds = $this->scope->constrainStock(Stock::query(), $this->member($this->unitA))->pluck('id');
        $this->assertContains($stockA->id, $memberIds);
        $this->assertNotContains($stockB->id, $memberIds);

        $adminIds = $this->scope->constrainStock(Stock::query(), $this->withRole('admin'))->pluck('id');
        $this->assertContains($stockA->id, $adminIds);
        $this->assertContains($stockB->id, $adminIds);
    }
}
