<?php

namespace Tests\Feature\AttendancePayroll;

use App\Enums\VacationRequestStatus;
use App\Models\Employee;
use App\Models\EmploymentPeriod;
use App\Models\User;
use App\Models\VacationEntitlement;
use App\Models\VacationRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class ListEmployeeVacationRequestsApiTest extends TestCase
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

    private function makeEmployee(): Employee
    {
        $period = EmploymentPeriod::factory()->create([
            'is_active' => true,
            'start_date' => '2020-01-01',
        ]);

        return $period->employee;
    }

    private function makeVacationRequest(Employee $employee, VacationRequestStatus $status): VacationRequest
    {
        $entitlement = VacationEntitlement::firstOrCreate(
            ['employee_id' => $employee->id, 'year' => 2026],
            ['entitled_days' => 12, 'used_days' => 0, 'rule_key' => 'VacationsLFTMX']
        );

        return VacationRequest::create([
            'employee_id' => $employee->id,
            'vacation_entitlement_id' => $entitlement->id,
            'start_date' => '2026-08-10',
            'end_date' => '2026-08-10',
            'days_count' => 1,
            'status' => $status,
            'requested_by' => $this->admin->id,
        ]);
    }

    #[Test]
    public function admin_can_list_an_employees_vacation_requests(): void
    {
        $employee = $this->makeEmployee();
        $this->makeVacationRequest($employee, VacationRequestStatus::PENDING);

        $response = $this->getJson("/api/v1/employees/{$employee->public_id}/vacation-requests");

        $response->assertStatus(200);
        $this->assertCount(1, $response->json('data'));
    }

    #[Test]
    public function it_filters_by_status(): void
    {
        $employee = $this->makeEmployee();
        $this->makeVacationRequest($employee, VacationRequestStatus::PENDING);
        $this->makeVacationRequest($employee, VacationRequestStatus::APPROVED);

        $response = $this->getJson("/api/v1/employees/{$employee->public_id}/vacation-requests?status=APPROVED");

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertCount(1, $data);
        $this->assertSame('APPROVED', $data[0]['status']);
    }

    #[Test]
    public function it_returns_403_for_unauthorized_request(): void
    {
        $employee = $this->makeEmployee();
        Passport::actingAs(User::factory()->create());

        $this->getJson("/api/v1/employees/{$employee->public_id}/vacation-requests")
            ->assertStatus(403);
    }

    #[Test]
    public function self_service_user_can_list_their_own_vacation_requests(): void
    {
        $employee = $this->makeEmployee();
        $this->makeVacationRequest($employee, VacationRequestStatus::PENDING);

        $user = User::factory()->create();
        $user->assignRole('employee');
        $employee->update(['user_id' => $user->id]);

        Passport::actingAs($user);

        $response = $this->getJson("/api/v1/employees/{$employee->public_id}/vacation-requests");

        $response->assertStatus(200);
        $this->assertCount(1, $response->json('data'));
    }

    #[Test]
    public function self_service_user_cannot_list_another_employees_vacation_requests(): void
    {
        $employee = $this->makeEmployee();
        $this->makeVacationRequest($employee, VacationRequestStatus::PENDING);

        $user = User::factory()->create();
        $user->assignRole('employee');
        // Note: $user is not linked to $employee (no matching user_id)

        Passport::actingAs($user);

        $this->getJson("/api/v1/employees/{$employee->public_id}/vacation-requests")
            ->assertStatus(403);
    }
}
