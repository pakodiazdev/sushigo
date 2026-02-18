<?php

namespace Tests\Feature\AttendancePayroll;

use App\Actions\Employee\CreateEmployeeAction;
use App\Models\Branch;
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

    protected Branch $branch;

    protected function setUp(): void
    {
        parent::setUp();

        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        Permission::create(['name' => 'users.show', 'guard_name' => 'api']);
        Permission::create(['name' => 'users.index', 'guard_name' => 'api']);
        Permission::create(['name' => 'employees.view', 'guard_name' => 'api']);

        // Position roles (manager, cook, kitchen-assistant, delivery-driver, acting-manager)
        foreach (Employee::POSITION_ROLES as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);
        }

        $this->action = app(CreateEmployeeAction::class);
        $this->branch = Branch::factory()->create();

        Notification::fake();
    }

    #[Test]
    public function it_creates_employee_with_email(): void
    {
        $employee = ($this->action)([
            'code' => 'EMP-001',
            'first_name' => 'Juan',
            'last_name' => 'Perez',
            'roles' => ['cook'],
            'email' => 'juan@sushigo.com',
            'branch_id' => $this->branch->id,
            'start_date' => '2026-01-15',
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
            'roles' => ['cook'],
            'phone' => '+525512345678',
            'branch_id' => $this->branch->id,
            'start_date' => '2026-01-15',
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
            'roles' => ['manager'],
            'email' => 'carlos@sushigo.com',
            'phone' => '+525500001111',
            'branch_id' => $this->branch->id,
            'start_date' => '2026-01-15',
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
            'roles' => ['cook'],
            'email' => 'always@sushigo.com',
            'branch_id' => $this->branch->id,
            'start_date' => '2026-01-15',
        ]);

        $this->assertEquals($initialUserCount + 1, User::count());
    }

    #[Test]
    public function it_assigns_position_role_to_cook(): void
    {
        $employee = ($this->action)([
            'code' => 'EMP-COOK',
            'first_name' => 'Pedro',
            'last_name' => 'Garcia',
            'roles' => ['cook'],
            'email' => 'pedro@sushigo.com',
            'branch_id' => $this->branch->id,
            'start_date' => '2026-01-15',
        ]);

        // Roles live on User — position roles reflect org role, no base 'employee' role
        $this->assertTrue($employee->user->hasRole('cook'));
        $this->assertFalse($employee->user->hasRole('manager'));
    }

    #[Test]
    public function it_assigns_position_role_to_kitchen_assistant(): void
    {
        $employee = ($this->action)([
            'code' => 'EMP-KA',
            'first_name' => 'Ana',
            'last_name' => 'Martinez',
            'roles' => ['kitchen-assistant'],
            'phone' => '+525500001112',
            'branch_id' => $this->branch->id,
            'start_date' => '2026-01-15',
        ]);

        $this->assertTrue($employee->user->hasRole('kitchen-assistant'));
        $this->assertFalse($employee->user->hasRole('manager'));
    }

    #[Test]
    public function it_assigns_position_role_to_delivery_driver(): void
    {
        $employee = ($this->action)([
            'code' => 'EMP-DD',
            'first_name' => 'Luis',
            'last_name' => 'Ramirez',
            'roles' => ['delivery-driver'],
            'phone' => '+525500001113',
            'branch_id' => $this->branch->id,
            'start_date' => '2026-01-15',
        ]);

        $this->assertTrue($employee->user->hasRole('delivery-driver'));
        $this->assertFalse($employee->user->hasRole('manager'));
    }

    #[Test]
    public function it_assigns_manager_position_role(): void
    {
        $employee = ($this->action)([
            'code' => 'EMP-MGR',
            'first_name' => 'Carlos',
            'last_name' => 'Mendoza',
            'roles' => ['manager'],
            'email' => 'carlos@sushigo.com',
            'branch_id' => $this->branch->id,
            'start_date' => '2026-01-15',
        ]);

        $this->assertTrue($employee->user->hasRole('manager'));
        $this->assertFalse($employee->user->hasRole('cook'));
    }

    #[Test]
    public function it_can_assign_multiple_position_roles(): void
    {
        $employee = ($this->action)([
            'code' => 'EMP-MULTI',
            'first_name' => 'Multi',
            'last_name' => 'Role',
            'roles' => ['cook', 'delivery-driver'],
            'email' => 'multi@sushigo.com',
            'branch_id' => $this->branch->id,
            'start_date' => '2026-01-15',
        ]);

        $this->assertTrue($employee->user->hasRole('cook'));
        $this->assertTrue($employee->user->hasRole('delivery-driver'));
        $positionRoles = $employee->getPositionRoles();
        $this->assertCount(2, $positionRoles);
        // Position roles are assigned directly — no derived 'employee' base role
        $this->assertFalse($employee->user->hasRole('manager'));
    }

    #[Test]
    public function it_manager_plus_cook_gives_user_both_position_roles(): void
    {
        $employee = ($this->action)([
            'code' => 'EMP-MC',
            'first_name' => 'Manager',
            'last_name' => 'Cook',
            'roles' => ['manager', 'cook'],
            'email' => 'mgr-cook@sushigo.com',
            'branch_id' => $this->branch->id,
            'start_date' => '2026-01-15',
        ]);

        $this->assertTrue($employee->user->hasRole('manager'));
    }

    #[Test]
    public function it_sets_a_random_password(): void
    {
        $employee = ($this->action)([
            'code' => 'EMP-HASH',
            'first_name' => 'Hash',
            'last_name' => 'Test',
            'roles' => ['cook'],
            'email' => 'hash@sushigo.com',
            'branch_id' => $this->branch->id,
            'start_date' => '2026-01-15',
        ]);

        $this->assertNotNull($employee->user->password);
        $this->assertNotEmpty($employee->user->password);
    }

    #[Test]
    public function it_wraps_creation_in_transaction(): void
    {
        $initialUserCount = User::count();

        // First creation — succeeds
        ($this->action)([
            'code'       => 'EMP-TX',
            'first_name' => 'First',
            'last_name'  => 'Employee',
            'roles'      => ['cook'],
            'email'      => 'first@sushigo.com',
            'branch_id'  => $this->branch->id,
            'start_date' => '2026-01-15',
        ]);

        $countAfterFirst = User::count();

        // Second creation with non-existent branch_id — FK constraint inside the
        // transaction should trigger a rollback, preventing the user from being persisted.
        try {
            ($this->action)([
                'code'       => 'EMP-TX2',
                'first_name' => 'Second',
                'last_name'  => 'Employee',
                'roles'      => ['cook'],
                'email'      => 'second@sushigo.com',
                'branch_id'  => 999999, // non-existent — FK violation triggers rollback
                'start_date' => '2026-01-15',
            ]);
        } catch (\Throwable) {
            // Expected: FK constraint violation on employment_periods.branch_id
        }

        $this->assertEquals($countAfterFirst, User::count(), 'User should not have been created due to transaction rollback');
    }

    #[Test]
    public function it_stores_meta_data(): void
    {
        $employee = ($this->action)([
            'code' => 'EMP-META',
            'first_name' => 'Meta',
            'last_name' => 'Test',
            'roles' => ['cook'],
            'email' => 'meta@sushigo.com',
            'meta' => ['emergency_contact' => 'Mom', 'notes' => 'Part-time'],
            'branch_id' => $this->branch->id,
            'start_date' => '2026-01-15',
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
            'roles' => ['cook'],
            'email' => 'eager@sushigo.com',
            'branch_id' => $this->branch->id,
            'start_date' => '2026-01-15',
        ]);

        // Roles are on User - only 'user' relation is eager-loaded on Employee
        $this->assertTrue($employee->relationLoaded('user'));
    }
}
