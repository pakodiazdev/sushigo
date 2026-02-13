<?php

namespace Tests\Feature\AttendancePayroll;

use App\Actions\Employee\CreateEmployeeAction;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class CreateEmployeeActionTest extends TestCase
{
    use RefreshDatabase;

    private CreateEmployeeAction $action;

    protected function setUp(): void
    {
        parent::setUp();

        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        Permission::create(['name' => 'users.show', 'guard_name' => 'api']);
        Permission::create(['name' => 'users.index', 'guard_name' => 'api']);
        Permission::create(['name' => 'employees.view', 'guard_name' => 'api']);

        $employeeRole = Role::create(['name' => 'employee', 'guard_name' => 'api']);
        $employeeRole->givePermissionTo(['users.show', 'users.index']);

        $employeeManagerRole = Role::create(['name' => 'employee-manager', 'guard_name' => 'api']);
        $employeeManagerRole->givePermissionTo(['users.show', 'users.index', 'employees.view']);

        // Create position roles
        foreach (Employee::POSITION_ROLES as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);
        }

        $this->action = app(CreateEmployeeAction::class);

        Notification::fake();
    }

    #[Test]
    public function it_creates_employee_with_email(): void
    {
        $employee = ($this->action)([
            'code' => 'EMP-001',
            'first_name' => 'Juan',
            'last_name' => 'Perez',
            'roles' => ['employee-cook'],
            'email' => 'juan@sushigo.com',
        ]);

        $this->assertInstanceOf(Employee::class, $employee);
        $this->assertEquals('EMP-001', $employee->code);
        $this->assertNotNull($employee->user_id);
        $this->assertEquals('juan@sushigo.com', $employee->user->email);
        $this->assertNull($employee->user->phone);
        $this->assertTrue($employee->is_active);
    }

    #[Test]
    public function it_creates_employee_with_phone(): void
    {
        $employee = ($this->action)([
            'code' => 'EMP-002',
            'first_name' => 'Maria',
            'last_name' => 'Lopez',
            'roles' => ['employee-cook'],
            'phone' => '+525512345678',
        ]);

        $this->assertNotNull($employee->user_id);
        $this->assertNotNull($employee->user);
        $this->assertEquals('+525512345678', $employee->user->phone);
        $this->assertNull($employee->user->email);
        $this->assertEquals('Maria Lopez', $employee->user->name);
    }

    #[Test]
    public function it_creates_employee_with_email_and_phone(): void
    {
        $employee = ($this->action)([
            'code' => 'EMP-BOTH',
            'first_name' => 'Carlos',
            'last_name' => 'Garcia',
            'roles' => ['employee-manager'],
            'email' => 'carlos@sushigo.com',
            'phone' => '+525500001111',
        ]);

        $this->assertNotNull($employee->user_id);
        $this->assertEquals('carlos@sushigo.com', $employee->user->email);
        $this->assertEquals('+525500001111', $employee->user->phone);
    }

    #[Test]
    public function it_always_creates_a_user(): void
    {
        $initialUserCount = User::count();

        ($this->action)([
            'code' => 'EMP-ALWAYS',
            'first_name' => 'Always',
            'last_name' => 'User',
            'roles' => ['employee-cook'],
            'email' => 'always@sushigo.com',
        ]);

        $this->assertEquals($initialUserCount + 1, User::count());
    }

    #[Test]
    public function it_assigns_employee_system_role_to_cook(): void
    {
        $employee = ($this->action)([
            'code' => 'EMP-COOK',
            'first_name' => 'Pedro',
            'last_name' => 'Garcia',
            'roles' => ['employee-cook'],
            'email' => 'pedro@sushigo.com',
        ]);

        // Cook gets 'employee' system role on User
        $this->assertTrue($employee->user->hasRole('employee'));
        $this->assertFalse($employee->user->hasRole('employee-manager'));
        // Employee model has position role
        $this->assertTrue($employee->hasRole('employee-cook'));
    }

    #[Test]
    public function it_assigns_employee_system_role_to_kitchen_assistant(): void
    {
        $employee = ($this->action)([
            'code' => 'EMP-KA',
            'first_name' => 'Ana',
            'last_name' => 'Martinez',
            'roles' => ['employee-kitchen-assistant'],
            'phone' => '+525500001112',
        ]);

        $this->assertTrue($employee->user->hasRole('employee'));
        $this->assertTrue($employee->hasRole('employee-kitchen-assistant'));
    }

    #[Test]
    public function it_assigns_employee_system_role_to_delivery_driver(): void
    {
        $employee = ($this->action)([
            'code' => 'EMP-DD',
            'first_name' => 'Luis',
            'last_name' => 'Ramirez',
            'roles' => ['employee-delivery-driver'],
            'phone' => '+525500001113',
        ]);

        $this->assertTrue($employee->user->hasRole('employee'));
        $this->assertTrue($employee->hasRole('employee-delivery-driver'));
    }

    #[Test]
    public function it_assigns_employee_manager_system_role_to_manager(): void
    {
        $employee = ($this->action)([
            'code' => 'EMP-MGR',
            'first_name' => 'Carlos',
            'last_name' => 'Mendoza',
            'roles' => ['employee-manager'],
            'email' => 'carlos@sushigo.com',
        ]);

        // Manager gets 'employee-manager' system role on User
        $this->assertTrue($employee->user->hasRole('employee-manager'));
        $this->assertFalse($employee->user->hasRole('employee'));
        // Employee model has position role
        $this->assertTrue($employee->hasRole('employee-manager'));
    }

    #[Test]
    public function it_can_assign_multiple_roles(): void
    {
        $employee = ($this->action)([
            'code' => 'EMP-MULTI',
            'first_name' => 'Multi',
            'last_name' => 'Role',
            'roles' => ['employee-cook', 'employee-delivery-driver'],
            'email' => 'multi@sushigo.com',
        ]);

        $this->assertTrue($employee->hasRole('employee-cook'));
        $this->assertTrue($employee->hasRole('employee-delivery-driver'));
        $this->assertCount(2, $employee->roles);
        // Non-manager combo → User gets 'employee'
        $this->assertTrue($employee->user->hasRole('employee'));
    }

    #[Test]
    public function it_manager_plus_cook_gives_user_employee_manager_role(): void
    {
        $employee = ($this->action)([
            'code' => 'EMP-MC',
            'first_name' => 'Manager',
            'last_name' => 'Cook',
            'roles' => ['employee-manager', 'employee-cook'],
            'email' => 'mgr-cook@sushigo.com',
        ]);

        // Has manager in the mix → User gets 'employee-manager'
        $this->assertTrue($employee->user->hasRole('employee-manager'));
    }

    #[Test]
    public function it_sets_a_random_password(): void
    {
        $employee = ($this->action)([
            'code' => 'EMP-HASH',
            'first_name' => 'Hash',
            'last_name' => 'Test',
            'roles' => ['employee-cook'],
            'email' => 'hash@sushigo.com',
        ]);

        // User should have a hashed password set (random, not empty)
        $this->assertNotNull($employee->user->password);
        $this->assertNotEmpty($employee->user->password);
    }

    #[Test]
    public function it_wraps_creation_in_transaction(): void
    {
        $initialUserCount = User::count();

        try {
            ($this->action)([
                'code' => 'EMP-TX',
                'first_name' => 'Transaction',
                'last_name' => 'Test',
                'roles' => ['employee-cook'],
                'email' => null,
                'phone' => null,
            ]);
        } catch (\Throwable) {
            // Expected to fail — no email/phone
        }

        $this->assertEquals($initialUserCount, User::count(), 'User should not have been created due to transaction rollback');
    }

    #[Test]
    public function it_stores_meta_data(): void
    {
        $employee = ($this->action)([
            'code' => 'EMP-META',
            'first_name' => 'Meta',
            'last_name' => 'Test',
            'roles' => ['employee-cook'],
            'email' => 'meta@sushigo.com',
            'meta' => ['emergency_contact' => 'Mom', 'notes' => 'Part-time'],
        ]);

        $this->assertEquals(['emergency_contact' => 'Mom', 'notes' => 'Part-time'], $employee->meta);
    }

    #[Test]
    public function it_eager_loads_user_and_roles_relations(): void
    {
        $employee = ($this->action)([
            'code' => 'EMP-EAGER',
            'first_name' => 'Eager',
            'last_name' => 'Load',
            'roles' => ['employee-cook'],
            'email' => 'eager@sushigo.com',
        ]);

        $this->assertTrue($employee->relationLoaded('user'));
        $this->assertTrue($employee->relationLoaded('roles'));
    }
}
