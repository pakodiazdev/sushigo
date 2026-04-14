<?php

namespace Tests\Feature\Inventory;

use App\Models\Branch;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * Verifies that inventory routes enforce permission guards correctly.
 *
 * - inventory-manager → full access to items, locations, stock
 * - admin             → same access (inherits inventory permissions)
 * - cook              → 403 on all inventory write + read endpoints
 * - unauthenticated   → 401 on all protected endpoints
 */
class InventoryPermissionsTest extends TestCase
{
    use RefreshDatabase;

    private User $inventoryManager;

    private User $admin;

    private User $cook;

    protected function setUp(): void
    {
        parent::setUp();

        // Create all inventory permissions
        $inventoryPermissions = [
            'items.view', 'items.create', 'items.update', 'items.delete',
            'inventory_locations.view', 'inventory_locations.manage',
            'stock.view', 'stock.manage',
        ];

        foreach ($inventoryPermissions as $name) {
            Permission::create(['name' => $name, 'guard_name' => 'api']);
        }

        // Also create employee permissions needed for role creation context
        foreach (Employee::POSITION_ROLES as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);
        }

        // inventory-manager role: full inventory access
        $inventoryManagerRole = Role::firstOrCreate(['name' => 'inventory-manager', 'guard_name' => 'api']);
        $inventoryManagerRole->givePermissionTo($inventoryPermissions);

        // admin role: also gets inventory access
        $adminRole = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'api']);
        $adminRole->givePermissionTo($inventoryPermissions);

        // Users
        $this->inventoryManager = User::factory()->create();
        $this->inventoryManager->assignRole('inventory-manager');

        $this->admin = User::factory()->create();
        $this->admin->assignRole('admin');

        $this->cook = User::factory()->create();
        $this->cook->assignRole('cook');
    }

    // -------------------------------------------------------------------------
    // Items — inventory-manager access
    // -------------------------------------------------------------------------

    #[Test]
    public function inventory_manager_can_list_items(): void
    {
        Passport::actingAs($this->inventoryManager);

        $this->getJson('/api/v1/items')->assertStatus(200);
    }

    #[Test]
    public function inventory_manager_can_create_item(): void
    {
        Passport::actingAs($this->inventoryManager);

        $response = $this->postJson('/api/v1/items', [
            'sku' => 'INV-TEST-001',
            'name' => 'Test Item',
            'type' => 'INSUMO',
            'is_stocked' => true,
            'is_perishable' => false,
        ]);

        $response->assertStatus(201);
    }

    // -------------------------------------------------------------------------
    // Items — admin access
    // -------------------------------------------------------------------------

    #[Test]
    public function admin_can_list_items(): void
    {
        Passport::actingAs($this->admin);

        $this->getJson('/api/v1/items')->assertStatus(200);
    }

    #[Test]
    public function admin_can_create_item(): void
    {
        Passport::actingAs($this->admin);

        $response = $this->postJson('/api/v1/items', [
            'sku' => 'ADM-TEST-001',
            'name' => 'Admin Item',
            'type' => 'INSUMO',
            'is_stocked' => true,
            'is_perishable' => false,
        ]);

        $response->assertStatus(201);
    }

    // -------------------------------------------------------------------------
    // Items — cook forbidden
    // -------------------------------------------------------------------------

    #[Test]
    public function cook_cannot_list_items(): void
    {
        Passport::actingAs($this->cook);

        $this->getJson('/api/v1/items')->assertStatus(403);
    }

    #[Test]
    public function cook_cannot_create_item(): void
    {
        Passport::actingAs($this->cook);

        $this->postJson('/api/v1/items', [
            'sku' => 'COOK-001',
            'name' => 'Unauthorized Item',
            'type' => 'INSUMO',
            'is_stocked' => true,
            'is_perishable' => false,
        ])->assertStatus(403);
    }

    // -------------------------------------------------------------------------
    // Inventory Locations
    // -------------------------------------------------------------------------

    #[Test]
    public function inventory_manager_can_list_locations(): void
    {
        Passport::actingAs($this->inventoryManager);

        $this->getJson('/api/v1/inventory-locations')->assertStatus(200);
    }

    #[Test]
    public function cook_cannot_list_locations(): void
    {
        Passport::actingAs($this->cook);

        $this->getJson('/api/v1/inventory-locations')->assertStatus(403);
    }

    #[Test]
    public function cook_cannot_manage_locations(): void
    {
        Passport::actingAs($this->cook);

        $this->postJson('/api/v1/inventory-locations', [
            'name' => 'Unauthorized Location',
            'type' => 'MAIN',
        ])->assertStatus(403);
    }

    // -------------------------------------------------------------------------
    // Stock
    // -------------------------------------------------------------------------

    #[Test]
    public function inventory_manager_can_view_stock(): void
    {
        Passport::actingAs($this->inventoryManager);

        $this->getJson('/api/v1/stock')->assertStatus(200);
    }

    #[Test]
    public function cook_cannot_view_stock(): void
    {
        Passport::actingAs($this->cook);

        $this->getJson('/api/v1/stock')->assertStatus(403);
    }

    #[Test]
    public function cook_cannot_register_stock_out(): void
    {
        Passport::actingAs($this->cook);

        $this->postJson('/api/v1/inventory/stock-out', [])->assertStatus(403);
    }

    // -------------------------------------------------------------------------
    // Unauthenticated
    // -------------------------------------------------------------------------

    #[Test]
    public function unauthenticated_cannot_access_items(): void
    {
        $this->getJson('/api/v1/items')->assertStatus(401);
    }

    #[Test]
    public function unauthenticated_cannot_access_stock(): void
    {
        $this->getJson('/api/v1/stock')->assertStatus(401);
    }

    // -------------------------------------------------------------------------
    // Employee model — inventory-manager is assignable
    // -------------------------------------------------------------------------

    #[Test]
    public function inventory_manager_is_in_position_roles(): void
    {
        $this->assertContains('inventory-manager', Employee::POSITION_ROLES);
    }

    #[Test]
    public function admin_can_create_employee_with_inventory_manager_role(): void
    {
        Passport::actingAs($this->admin);

        // admin needs employees.create permission too
        Permission::create(['name' => 'employees.create', 'guard_name' => 'api']);
        Permission::create(['name' => 'employees.view', 'guard_name' => 'api']);
        $this->admin->givePermissionTo(['employees.create', 'employees.view']);

        $response = $this->postJson('/api/v1/employees', [
            'code' => 'INV-001',
            'first_name' => 'Inventory',
            'last_name' => 'Manager',
            'email' => 'inv.manager@sushigo.com',
            'roles' => ['inventory-manager'],
            'branch_id' => Branch::factory()->create()->id,
            'start_date' => '2026-01-01',
        ]);

        $response->assertStatus(201);

        $createdUser = User::where('email', 'inv.manager@sushigo.com')->first();
        $this->assertNotNull($createdUser);
        $this->assertTrue($createdUser->hasRole('inventory-manager'));
    }
}
