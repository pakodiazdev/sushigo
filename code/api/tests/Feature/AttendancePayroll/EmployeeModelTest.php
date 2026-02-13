<?php

namespace Tests\Feature\AttendancePayroll;

use App\Models\Employee;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class EmployeeModelTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Create position roles needed by factory/model
        foreach (Employee::POSITION_ROLES as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);
        }
        Role::firstOrCreate(['name' => 'employee', 'guard_name' => 'api']);
        Role::firstOrCreate(['name' => 'employee-manager', 'guard_name' => 'api']);
    }

    #[Test]
    public function it_can_create_an_employee(): void
    {
        $employee = Employee::factory()->cook()->create([
            'code' => 'EMP-001',
            'first_name' => 'Juan',
            'last_name' => 'Pérez',
        ]);

        $this->assertDatabaseHas('employees', [
            'id' => $employee->id,
            'code' => 'EMP-001',
            'first_name' => 'Juan',
            'last_name' => 'Pérez',
            'is_active' => true,
        ]);

        $this->assertInstanceOf(Employee::class, $employee);
        $this->assertTrue($employee->hasRole(Employee::ROLE_COOK));
        $this->assertTrue($employee->is_active);
    }

    #[Test]
    public function it_can_soft_delete_an_employee(): void
    {
        $employee = Employee::factory()->create();

        $employee->delete();

        $this->assertSoftDeleted('employees', ['id' => $employee->id]);
        $this->assertNull(Employee::find($employee->id));
        $this->assertNotNull(Employee::withTrashed()->find($employee->id));
    }

    #[Test]
    public function it_enforces_unique_code_constraint(): void
    {
        Employee::factory()->create(['code' => 'EMP-001']);

        $this->expectException(\Illuminate\Database\QueryException::class);

        Employee::factory()->create(['code' => 'EMP-001']);
    }

    #[Test]
    public function it_can_associate_with_a_user(): void
    {
        $user = User::factory()->create();
        $employee = Employee::factory()->withUser($user)->create();

        $this->assertEquals($user->id, $employee->user_id);
        $this->assertInstanceOf(User::class, $employee->user);
        $this->assertEquals($user->id, $employee->user->id);
    }

    #[Test]
    public function it_allows_null_user(): void
    {
        $employee = Employee::factory()->create(['user_id' => null]);

        $this->assertNull($employee->user_id);
        $this->assertNull($employee->user);
    }

    #[Test]
    public function it_can_assign_spatie_roles(): void
    {
        $employee = Employee::factory()->manager()->create();

        $fresh = Employee::find($employee->id);
        $fresh->load('roles');

        $this->assertTrue($fresh->hasRole(Employee::ROLE_MANAGER));
    }

    #[Test]
    public function it_can_have_multiple_roles(): void
    {
        $employee = Employee::factory()->withRoles([
            Employee::ROLE_COOK,
            Employee::ROLE_DELIVERY_DRIVER,
        ])->create();

        $employee->load('roles');

        $this->assertTrue($employee->hasRole(Employee::ROLE_COOK));
        $this->assertTrue($employee->hasRole(Employee::ROLE_DELIVERY_DRIVER));
        $this->assertFalse($employee->hasRole(Employee::ROLE_MANAGER));
        $this->assertCount(2, $employee->roles);
    }

    #[Test]
    public function it_casts_meta_to_array(): void
    {
        $meta = ['phone' => '555-1234', 'address' => 'Calle 1'];
        $employee = Employee::factory()->create(['meta' => $meta]);

        $fresh = Employee::find($employee->id);

        $this->assertIsArray($fresh->meta);
        $this->assertEquals('555-1234', $fresh->meta['phone']);
    }

    #[Test]
    public function it_filters_active_employees_with_scope(): void
    {
        Employee::factory()->count(3)->create(['is_active' => true]);
        Employee::factory()->count(2)->inactive()->create();

        $active = Employee::active()->get();

        $this->assertCount(3, $active);
    }

    #[Test]
    public function it_filters_by_role_with_spatie_scope(): void
    {
        Employee::factory()->cook()->count(2)->create();
        Employee::factory()->manager()->create();
        Employee::factory()->deliveryDriver()->create();

        $cooks = Employee::role(Employee::ROLE_COOK)->get();

        $this->assertCount(2, $cooks);
    }

    #[Test]
    public function it_defines_all_position_roles(): void
    {
        $this->assertContains(Employee::ROLE_MANAGER, Employee::POSITION_ROLES);
        $this->assertContains(Employee::ROLE_COOK, Employee::POSITION_ROLES);
        $this->assertContains(Employee::ROLE_KITCHEN_ASSISTANT, Employee::POSITION_ROLES);
        $this->assertContains(Employee::ROLE_DELIVERY_DRIVER, Employee::POSITION_ROLES);
        $this->assertContains(Employee::ROLE_ACTING_MANAGER, Employee::POSITION_ROLES);
        $this->assertCount(5, Employee::POSITION_ROLES);
    }

    #[Test]
    public function factory_generates_valid_data(): void
    {
        $employee = Employee::factory()->create();

        $this->assertNotEmpty($employee->code);
        $this->assertNotEmpty($employee->first_name);
        $this->assertNotEmpty($employee->last_name);
        $this->assertTrue($employee->is_active);
        // Factory default assigns employee-cook
        $this->assertTrue($employee->hasRole(Employee::ROLE_COOK));
    }

    #[Test]
    public function sync_position_roles_updates_user_system_role(): void
    {
        $user = User::factory()->create();
        $user->assignRole('employee');
        $employee = Employee::factory()->withUser($user)->create();

        // Sync to manager — should update user to employee-manager
        $employee->syncPositionRoles([Employee::ROLE_MANAGER, Employee::ROLE_COOK]);

        $user->refresh();
        $this->assertTrue($user->hasRole('employee-manager'));
        $this->assertFalse($user->hasRole('employee'));
    }

    #[Test]
    public function sync_position_roles_gives_employee_role_when_no_manager(): void
    {
        $user = User::factory()->create();
        $user->assignRole('employee-manager');
        $employee = Employee::factory()->withUser($user)->create();

        // Sync to non-manager roles — user should become 'employee'
        $employee->syncPositionRoles([Employee::ROLE_COOK]);

        $user->refresh();
        $this->assertTrue($user->hasRole('employee'));
        $this->assertFalse($user->hasRole('employee-manager'));
    }

    #[Test]
    public function to_api_array_returns_roles_array(): void
    {
        $employee = Employee::factory()->withRoles([
            Employee::ROLE_COOK,
            Employee::ROLE_DELIVERY_DRIVER,
        ])->withUser()->create();

        $employee->load(['user', 'roles']);
        $apiArray = $employee->toApiArray();

        $this->assertArrayHasKey('roles', $apiArray);
        $this->assertIsArray($apiArray['roles']);
        $this->assertContains(Employee::ROLE_COOK, $apiArray['roles']);
        $this->assertContains(Employee::ROLE_DELIVERY_DRIVER, $apiArray['roles']);
        $this->assertArrayNotHasKey('role', $apiArray);
    }
}
