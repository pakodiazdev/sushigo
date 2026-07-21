<?php

namespace Tests\Feature\AttendancePayroll;

use App\Models\Employee;
use App\Models\OvertimeBankMovement;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class OvertimeBankApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        Permission::create(['name' => 'employees.view', 'guard_name' => 'api']);
        Permission::create(['name' => 'employee-requests.create', 'guard_name' => 'api']);

        $adminRole = Role::create(['name' => 'admin', 'guard_name' => 'api']);
        $adminRole->givePermissionTo('employees.view');

        $selfServiceRole = Role::create(['name' => 'employee', 'guard_name' => 'api']);
        $selfServiceRole->givePermissionTo('employee-requests.create');

        foreach (Employee::POSITION_ROLES as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);
        }

        $this->admin = User::factory()->create();
        $this->admin->assignRole('admin');

        Passport::actingAs($this->admin);
    }

    #[Test]
    public function it_returns_balance_and_movements_for_employee(): void
    {
        $employee = Employee::factory()->create();

        OvertimeBankMovement::factory()->earned()->create([
            'employee_id' => $employee->id,
            'date' => '2026-06-10',
            'minutes' => 120,
        ]);

        OvertimeBankMovement::factory()->paid()->create([
            'employee_id' => $employee->id,
            'date' => '2026-06-12',
            'minutes' => 60,
        ]);

        $response = $this->getJson("/api/v1/employees/{$employee->public_id}/overtime-bank");

        $response->assertStatus(200);
        $this->assertCount(2, $response->json('data'));
        $this->assertSame(60, $response->json('meta.balance_minutes'));
        $this->assertSame('1:00', $response->json('meta.balance_formatted'));
    }

    #[Test]
    public function it_includes_authorized_by_name_for_paid_movements(): void
    {
        $employee = Employee::factory()->create();
        $manager = User::factory()->create(['first_name' => 'Jane', 'last_name' => 'Manager']);

        OvertimeBankMovement::factory()->paid()->create([
            'employee_id' => $employee->id,
            'minutes' => 60,
            'authorized_by' => $manager->id,
        ]);

        $response = $this->getJson("/api/v1/employees/{$employee->public_id}/overtime-bank");

        $response->assertStatus(200);
        $this->assertSame('Jane Manager', $response->json('data.0.authorized_by'));
    }

    #[Test]
    public function it_returns_empty_movements_and_zero_balance_for_employee_with_no_movements(): void
    {
        $employee = Employee::factory()->create();

        $response = $this->getJson("/api/v1/employees/{$employee->public_id}/overtime-bank");

        $response->assertStatus(200);
        $this->assertCount(0, $response->json('data'));
        $this->assertSame(0, $response->json('meta.balance_minutes'));
    }

    #[Test]
    public function it_returns_403_for_unauthorized_request(): void
    {
        $employee = Employee::factory()->create();
        Passport::actingAs(User::factory()->create());

        $response = $this->getJson("/api/v1/employees/{$employee->public_id}/overtime-bank");

        $response->assertStatus(403);
    }

    #[Test]
    public function self_service_user_can_view_their_own_overtime_bank(): void
    {
        $employee = Employee::factory()->create();
        $user = User::factory()->create();
        $user->assignRole('employee');
        $employee->update(['user_id' => $user->id]);

        Passport::actingAs($user);

        $response = $this->getJson("/api/v1/employees/{$employee->public_id}/overtime-bank");

        $response->assertStatus(200);
    }

    #[Test]
    public function self_service_user_cannot_view_another_employees_overtime_bank(): void
    {
        $employee = Employee::factory()->create();
        $user = User::factory()->create();
        $user->assignRole('employee');
        // Note: $user is not linked to $employee (no matching user_id)

        Passport::actingAs($user);

        $response = $this->getJson("/api/v1/employees/{$employee->public_id}/overtime-bank");

        $response->assertStatus(403);
    }
}
