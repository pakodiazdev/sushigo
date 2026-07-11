<?php

namespace Tests\Feature\AttendancePayroll;

use App\Models\Employee;
use App\Models\EmploymentPeriod;
use App\Models\User;
use App\Models\VacationEntitlement;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class VacationEntitlementApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        Permission::create(['name' => 'employees.view', 'guard_name' => 'api']);
        Permission::create(['name' => 'employees.update', 'guard_name' => 'api']);
        Permission::create(['name' => 'employee-requests.create', 'guard_name' => 'api']);

        $role = Role::create(['name' => 'admin', 'guard_name' => 'api']);
        $role->givePermissionTo(['employees.view', 'employees.update']);

        $selfServiceRole = Role::create(['name' => 'employee', 'guard_name' => 'api']);
        $selfServiceRole->givePermissionTo('employee-requests.create');

        foreach (Employee::POSITION_ROLES as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);
        }

        $this->admin = User::factory()->create();
        $this->admin->assignRole('admin');

        Passport::actingAs($this->admin);
    }

    private function employeeStartedOn(string $startDate): Employee
    {
        $employee = Employee::factory()->create();
        EmploymentPeriod::factory()->create([
            'employee_id' => $employee->id,
            'start_date' => $startDate,
            'end_date' => null,
            'termination_type' => null,
        ]);

        return $employee;
    }

    #[Test]
    public function it_lists_vacation_entitlements_for_employee(): void
    {
        $employee = $this->employeeStartedOn(Carbon::today()->subYears(1)->toDateString());

        VacationEntitlement::create([
            'employee_id' => $employee->id,
            'year' => Carbon::today()->year,
            'entitled_days' => 20,
            'used_days' => 5,
            'rule_key' => 'VacationsLFTMX',
        ]);

        $response = $this->getJson("/api/v1/employees/{$employee->public_id}/vacation-entitlements");

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertCount(1, $data);
        $this->assertSame(15, $data[0]['remaining_days']);
    }

    #[Test]
    public function it_auto_generates_missing_entitlements_when_a_new_anniversary_is_reached(): void
    {
        // Started 2 years ago → 2 completed anniversaries, none registered yet
        $employee = $this->employeeStartedOn(Carbon::today()->subYears(2)->toDateString());

        $this->assertDatabaseCount('vacation_entitlements', 0);

        $response = $this->getJson("/api/v1/employees/{$employee->public_id}/vacation-entitlements");

        $response->assertStatus(200);
        $this->assertDatabaseCount('vacation_entitlements', 2);

        $entitledDays = collect($response->json('data'))->sortBy('year')->pluck('entitled_days')->values();
        $this->assertSame([12, 14], $entitledDays->all());
    }

    #[Test]
    public function it_includes_seniority_summary_in_meta(): void
    {
        $startDate = Carbon::today()->subYears(2);
        $employee = $this->employeeStartedOn($startDate->toDateString());

        $response = $this->getJson("/api/v1/employees/{$employee->public_id}/vacation-entitlements");

        $response->assertStatus(200);
        $this->assertSame(2, $response->json('meta.seniority_years'));
        $this->assertSame(
            $startDate->copy()->addYears(3)->toDateString(),
            $response->json('meta.next_anniversary_date'),
        );
    }

    #[Test]
    public function it_does_not_duplicate_entitlements_on_repeated_requests(): void
    {
        $employee = $this->employeeStartedOn(Carbon::today()->subYears(2)->toDateString());

        $this->getJson("/api/v1/employees/{$employee->public_id}/vacation-entitlements")->assertStatus(200);
        $this->getJson("/api/v1/employees/{$employee->public_id}/vacation-entitlements")->assertStatus(200);

        $this->assertDatabaseCount('vacation_entitlements', 2);
    }

    #[Test]
    public function it_returns_403_for_unauthorized_request(): void
    {
        $employee = $this->employeeStartedOn(Carbon::today()->subYears(1)->toDateString());
        Passport::actingAs(User::factory()->create());

        $response = $this->getJson("/api/v1/employees/{$employee->public_id}/vacation-entitlements");

        $response->assertStatus(403);
    }

    #[Test]
    public function self_service_user_can_view_their_own_entitlements(): void
    {
        $employee = $this->employeeStartedOn(Carbon::today()->subYears(1)->toDateString());
        $user = User::factory()->create();
        $user->assignRole('employee');
        $employee->update(['user_id' => $user->id]);

        Passport::actingAs($user);

        $response = $this->getJson("/api/v1/employees/{$employee->public_id}/vacation-entitlements");

        $response->assertStatus(200);
    }

    #[Test]
    public function self_service_user_cannot_view_another_employees_entitlements(): void
    {
        $employee = $this->employeeStartedOn(Carbon::today()->subYears(1)->toDateString());
        $user = User::factory()->create();
        $user->assignRole('employee');
        // Note: $user is not linked to $employee (no matching user_id)

        Passport::actingAs($user);

        $response = $this->getJson("/api/v1/employees/{$employee->public_id}/vacation-entitlements");

        $response->assertStatus(403);
    }
}
