<?php

namespace Tests\Feature\Inventory;

use App\Models\Employee;
use App\Models\UnitOfMeasure;
use App\Models\UomConversion;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * Verifies that units-of-measure and uom-conversions write routes enforce
 * the units_of_measure.manage permission — list/show stay public.
 *
 * - inventory-manager → full write access
 * - admin             → full write access (inherits the permission)
 * - cook              → 403 on all write endpoints
 * - unauthenticated   → 401 on all write endpoints (public reads still 200)
 */
class UnitOfMeasurePermissionsTest extends TestCase
{
    use RefreshDatabase;

    private User $inventoryManager;

    private User $admin;

    private User $cook;

    protected function setUp(): void
    {
        parent::setUp();

        Permission::create(['name' => 'units_of_measure.manage', 'guard_name' => 'api']);

        foreach (Employee::POSITION_ROLES as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);
        }

        $inventoryManagerRole = Role::firstOrCreate(['name' => 'inventory-manager', 'guard_name' => 'api']);
        $inventoryManagerRole->givePermissionTo('units_of_measure.manage');

        $adminRole = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'api']);
        $adminRole->givePermissionTo('units_of_measure.manage');

        $this->inventoryManager = User::factory()->create();
        $this->inventoryManager->assignRole('inventory-manager');

        $this->admin = User::factory()->create();
        $this->admin->assignRole('admin');

        $this->cook = User::factory()->create();
        $this->cook->assignRole('cook');
    }

    // -------------------------------------------------------------------------
    // Public reads — untouched by this permission
    // -------------------------------------------------------------------------

    #[Test]
    public function anyone_can_list_units_of_measure(): void
    {
        $this->getJson('/api/v1/units-of-measure')->assertStatus(200);
    }

    #[Test]
    public function anyone_can_list_uom_conversions(): void
    {
        $this->getJson('/api/v1/uom-conversions')->assertStatus(200);
    }

    // -------------------------------------------------------------------------
    // Units of Measure — inventory-manager / admin can write
    // -------------------------------------------------------------------------

    #[Test]
    public function inventory_manager_can_create_unit_of_measure(): void
    {
        Passport::actingAs($this->inventoryManager);

        $this->postJson('/api/v1/units-of-measure', [
            'code' => 'LT',
            'name' => 'Litro',
            'symbol' => 'l',
        ])->assertStatus(201);
    }

    #[Test]
    public function admin_can_create_unit_of_measure(): void
    {
        Passport::actingAs($this->admin);

        $this->postJson('/api/v1/units-of-measure', [
            'code' => 'ML',
            'name' => 'Mililitro',
            'symbol' => 'ml',
        ])->assertStatus(201);
    }

    #[Test]
    public function inventory_manager_can_update_unit_of_measure(): void
    {
        Passport::actingAs($this->inventoryManager);

        $uom = UnitOfMeasure::create([
            'code' => 'PZ',
            'name' => 'Pieza',
            'symbol' => 'pz',
        ]);

        $this->putJson("/api/v1/units-of-measure/{$uom->public_id}", [
            'name' => 'Pieza actualizada',
        ])->assertStatus(200);
    }

    #[Test]
    public function inventory_manager_can_delete_unit_of_measure(): void
    {
        Passport::actingAs($this->inventoryManager);

        $uom = UnitOfMeasure::create([
            'code' => 'CJ',
            'name' => 'Caja',
            'symbol' => 'cj',
        ]);

        $this->deleteJson("/api/v1/units-of-measure/{$uom->public_id}")->assertStatus(200);
    }

    // -------------------------------------------------------------------------
    // Units of Measure — cook forbidden
    // -------------------------------------------------------------------------

    #[Test]
    public function cook_cannot_create_unit_of_measure(): void
    {
        Passport::actingAs($this->cook);

        $this->postJson('/api/v1/units-of-measure', [
            'code' => 'XX',
            'name' => 'Unauthorized',
            'symbol' => 'xx',
        ])->assertStatus(403);
    }

    #[Test]
    public function cook_cannot_update_unit_of_measure(): void
    {
        Passport::actingAs($this->cook);

        $uom = UnitOfMeasure::create([
            'code' => 'KG',
            'name' => 'Kilogramo',
            'symbol' => 'kg',
        ]);

        $this->putJson("/api/v1/units-of-measure/{$uom->public_id}", [
            'name' => 'Should not update',
        ])->assertStatus(403);
    }

    #[Test]
    public function cook_cannot_delete_unit_of_measure(): void
    {
        Passport::actingAs($this->cook);

        $uom = UnitOfMeasure::create([
            'code' => 'GR',
            'name' => 'Gramo',
            'symbol' => 'g',
        ]);

        $this->deleteJson("/api/v1/units-of-measure/{$uom->public_id}")->assertStatus(403);
    }

    // -------------------------------------------------------------------------
    // UOM Conversions — inventory-manager can write, cook forbidden
    // -------------------------------------------------------------------------

    #[Test]
    public function inventory_manager_can_create_uom_conversion(): void
    {
        Passport::actingAs($this->inventoryManager);

        $from = UnitOfMeasure::create(['code' => 'KG', 'name' => 'Kilogramo', 'symbol' => 'kg']);
        $to = UnitOfMeasure::create(['code' => 'GR', 'name' => 'Gramo', 'symbol' => 'g']);

        $this->postJson('/api/v1/uom-conversions', [
            'from_uom_id' => $from->id,
            'to_uom_id' => $to->id,
            'factor' => 1000,
        ])->assertStatus(201);
    }

    #[Test]
    public function inventory_manager_can_delete_uom_conversion(): void
    {
        Passport::actingAs($this->inventoryManager);

        $from = UnitOfMeasure::create(['code' => 'KG', 'name' => 'Kilogramo', 'symbol' => 'kg']);
        $to = UnitOfMeasure::create(['code' => 'GR', 'name' => 'Gramo', 'symbol' => 'g']);

        $createResponse = $this->postJson('/api/v1/uom-conversions', [
            'from_uom_id' => $from->id,
            'to_uom_id' => $to->id,
            'factor' => 1000,
        ]);

        $createResponse->assertStatus(201);
        $conversionId = $createResponse->json('data.id');
        $this->assertNotNull($conversionId);

        $this->deleteJson("/api/v1/uom-conversions/{$conversionId}")->assertStatus(200);
    }

    #[Test]
    public function cook_cannot_create_uom_conversion(): void
    {
        Passport::actingAs($this->cook);

        $from = UnitOfMeasure::create(['code' => 'KG', 'name' => 'Kilogramo', 'symbol' => 'kg']);
        $to = UnitOfMeasure::create(['code' => 'GR', 'name' => 'Gramo', 'symbol' => 'g']);

        $this->postJson('/api/v1/uom-conversions', [
            'from_uom_id' => $from->id,
            'to_uom_id' => $to->id,
            'factor' => 1000,
        ])->assertStatus(403);
    }

    #[Test]
    public function cook_cannot_delete_uom_conversion(): void
    {
        Passport::actingAs($this->cook);

        $from = UnitOfMeasure::create(['code' => 'KG', 'name' => 'Kilogramo', 'symbol' => 'kg']);
        $to = UnitOfMeasure::create(['code' => 'GR', 'name' => 'Gramo', 'symbol' => 'g']);

        $conversion = UomConversion::create([
            'from_uom_id' => $from->id,
            'to_uom_id' => $to->id,
            'factor' => 1000,
        ]);

        $this->deleteJson("/api/v1/uom-conversions/{$conversion->id}")->assertStatus(403);
    }

    // -------------------------------------------------------------------------
    // Unauthenticated
    // -------------------------------------------------------------------------

    #[Test]
    public function unauthenticated_cannot_create_unit_of_measure(): void
    {
        $this->postJson('/api/v1/units-of-measure', [
            'code' => 'YY',
            'name' => 'Unauthenticated',
            'symbol' => 'yy',
        ])->assertStatus(401);
    }

    #[Test]
    public function unauthenticated_cannot_create_uom_conversion(): void
    {
        $from = UnitOfMeasure::create(['code' => 'KG', 'name' => 'Kilogramo', 'symbol' => 'kg']);
        $to = UnitOfMeasure::create(['code' => 'GR', 'name' => 'Gramo', 'symbol' => 'g']);

        $this->postJson('/api/v1/uom-conversions', [
            'from_uom_id' => $from->id,
            'to_uom_id' => $to->id,
            'factor' => 1000,
        ])->assertStatus(401);
    }
}
