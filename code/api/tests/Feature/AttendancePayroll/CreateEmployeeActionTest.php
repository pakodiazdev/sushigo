<?php

namespace Tests\Feature\AttendancePayroll;

use App\Actions\Employee\CreateEmployeeAction;
use App\Enums\EmployeeRole;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
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

        $this->action = app(CreateEmployeeAction::class);
    }

    #[Test]
    public function it_creates_employee_with_email(): void
    {
        $employee = ($this->action)([
            'code' => 'EMP-001',
            'first_name' => 'Juan',
            'last_name' => 'Perez',
            'role' => 'COOK',
            'email' => 'juan@sushigo.com',
            'password' => 'password123',
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
            'role' => 'COOK',
            'phone' => '+525512345678',
            'password' => 'password123',
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
            'role' => 'MANAGER',
            'email' => 'carlos@sushigo.com',
            'phone' => '+525500001111',
            'password' => 'password123',
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
            'role' => 'COOK',
            'email' => 'always@sushigo.com',
            'password' => 'password123',
        ]);

        $this->assertEquals($initialUserCount + 1, User::count());
    }

    #[Test]
    public function it_assigns_employee_spatie_role_to_cook(): void
    {
        $employee = ($this->action)([
            'code' => 'EMP-COOK',
            'first_name' => 'Pedro',
            'last_name' => 'Garcia',
            'role' => 'COOK',
            'email' => 'pedro@sushigo.com',
            'password' => 'password123',
        ]);

        $this->assertTrue($employee->user->hasRole('employee'));
        $this->assertFalse($employee->user->hasRole('employee-manager'));
    }

    #[Test]
    public function it_assigns_employee_spatie_role_to_kitchen_assistant(): void
    {
        $employee = ($this->action)([
            'code' => 'EMP-KA',
            'first_name' => 'Ana',
            'last_name' => 'Martinez',
            'role' => 'KITCHEN_ASSISTANT',
            'phone' => '+525500001112',
            'password' => 'password123',
        ]);

        $this->assertTrue($employee->user->hasRole('employee'));
    }

    #[Test]
    public function it_assigns_employee_spatie_role_to_delivery_driver(): void
    {
        $employee = ($this->action)([
            'code' => 'EMP-DD',
            'first_name' => 'Luis',
            'last_name' => 'Ramirez',
            'role' => 'DELIVERY_DRIVER',
            'phone' => '+525500001113',
            'password' => 'password123',
        ]);

        $this->assertTrue($employee->user->hasRole('employee'));
    }

    #[Test]
    public function it_assigns_employee_manager_spatie_role_to_manager(): void
    {
        $employee = ($this->action)([
            'code' => 'EMP-MGR',
            'first_name' => 'Carlos',
            'last_name' => 'Mendoza',
            'role' => 'MANAGER',
            'email' => 'carlos@sushigo.com',
            'password' => 'password123',
        ]);

        $this->assertTrue($employee->user->hasRole('employee-manager'));
        $this->assertFalse($employee->user->hasRole('employee'));
    }

    #[Test]
    public function it_hashes_the_password(): void
    {
        $employee = ($this->action)([
            'code' => 'EMP-HASH',
            'first_name' => 'Hash',
            'last_name' => 'Test',
            'role' => 'COOK',
            'email' => 'hash@sushigo.com',
            'password' => 'plaintext123',
        ]);

        $this->assertNotEquals('plaintext123', $employee->user->password);
        $this->assertTrue(password_verify('plaintext123', $employee->user->password));
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
                'role' => 'INVALID_ROLE', // Will fail
                'email' => 'tx@sushigo.com',
                'password' => 'password123',
            ]);
        } catch (\Throwable) {
            // Expected to fail
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
            'role' => 'COOK',
            'email' => 'meta@sushigo.com',
            'password' => 'password123',
            'meta' => ['emergency_contact' => 'Mom', 'notes' => 'Part-time'],
        ]);

        $this->assertEquals(['emergency_contact' => 'Mom', 'notes' => 'Part-time'], $employee->meta);
    }

    #[Test]
    public function it_eager_loads_user_relation(): void
    {
        $employee = ($this->action)([
            'code' => 'EMP-EAGER',
            'first_name' => 'Eager',
            'last_name' => 'Load',
            'role' => 'COOK',
            'email' => 'eager@sushigo.com',
            'password' => 'password123',
        ]);

        $this->assertTrue($employee->relationLoaded('user'));
    }
}
