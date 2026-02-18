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
        // 'manager' is included in POSITION_ROLES below — no separate system roles needed
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
        // Roles live on User, not Employee
        $this->assertTrue($employee->user->hasRole(Employee::ROLE_COOK));
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
        // Note: factory always creates a user, so we manually unset it here
        $employee = Employee::factory()->create();
        $employee->user_id = null;
        $employee->save();
        $employee->unsetRelation('user');

        $this->assertNull($employee->user);
    }

    #[Test]
    public function it_can_assign_position_roles_to_user(): void
    {
        $employee = Employee::factory()->manager()->create();

        $fresh = Employee::with('user')->find($employee->id);

        // Roles live on User
        $this->assertTrue($fresh->user->hasRole(Employee::ROLE_MANAGER));
        $this->assertContains(Employee::ROLE_MANAGER, $fresh->getPositionRoles());
    }

    #[Test]
    public function it_can_have_multiple_position_roles_on_user(): void
    {
        $employee = Employee::factory()->withRoles([
            Employee::ROLE_COOK,
            Employee::ROLE_DELIVERY_DRIVER,
        ])->create();

        $employee->load('user');

        $this->assertTrue($employee->user->hasRole(Employee::ROLE_COOK));
        $this->assertTrue($employee->user->hasRole(Employee::ROLE_DELIVERY_DRIVER));
        $this->assertFalse($employee->user->hasRole(Employee::ROLE_MANAGER));

        $positionRoles = $employee->getPositionRoles();
        $this->assertCount(2, $positionRoles);
        $this->assertContains(Employee::ROLE_COOK, $positionRoles);
        $this->assertContains(Employee::ROLE_DELIVERY_DRIVER, $positionRoles);
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
    public function it_filters_users_by_position_role(): void
    {
        Employee::factory()->cook()->count(2)->create();
        Employee::factory()->manager()->create();
        Employee::factory()->deliveryDriver()->create();

        // Roles are on User — query via User::role() scoped to position roles
        $cooks = User::role(Employee::ROLE_COOK)->get();

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
        // Factory default assigns employee-cook to the linked User
        $this->assertTrue($employee->user->hasRole(Employee::ROLE_COOK));
    }

    #[Test]
    public function sync_position_roles_assigns_position_roles_to_user(): void
    {
        $user = User::factory()->create();
        $employee = Employee::factory()->withUser($user)->create();

        // Sync to manager+cook — both position roles should be assigned
        $employee->syncPositionRoles([Employee::ROLE_MANAGER, Employee::ROLE_COOK]);

        $user->refresh();
        $this->assertTrue($user->hasRole('manager'));
        $this->assertTrue($user->hasRole('cook'));
    }

    #[Test]
    public function sync_position_roles_replaces_old_position_roles(): void
    {
        $user = User::factory()->create();
        $user->assignRole('manager');
        $employee = Employee::factory()->withUser($user)->create();

        // Sync to cook only — manager role should be replaced
        $employee->syncPositionRoles([Employee::ROLE_COOK]);

        $user->refresh();
        $this->assertTrue($user->hasRole('cook'));
        $this->assertFalse($user->hasRole('manager'));
    }

    #[Test]
    public function to_api_array_returns_position_roles_array(): void
    {
        $employee = Employee::factory()->withRoles([
            Employee::ROLE_COOK,
            Employee::ROLE_DELIVERY_DRIVER,
        ])->withUser()->create();

        $employee->load('user');
        $apiArray = $employee->toApiArray();

        $this->assertArrayHasKey('roles', $apiArray);
        $this->assertIsArray($apiArray['roles']);
        $this->assertContains(Employee::ROLE_COOK, $apiArray['roles']);
        $this->assertContains(Employee::ROLE_DELIVERY_DRIVER, $apiArray['roles']);
        $this->assertArrayNotHasKey('role', $apiArray);
    }
}
