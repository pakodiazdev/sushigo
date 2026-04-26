<?php

namespace Tests\Feature\AttendancePayroll;

use App\Models\Employee;
use App\Models\EmployeeSchedule;
use App\Models\EmploymentPeriod;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class CurrentScheduleApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        Permission::create(['name' => 'employees.view', 'guard_name' => 'api']);

        $role = Role::create(['name' => 'admin', 'guard_name' => 'api']);
        $role->givePermissionTo('employees.view');

        foreach (Employee::POSITION_ROLES as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);
        }

        $this->admin = User::factory()->create();
        $this->admin->assignRole('admin');
        Passport::actingAs($this->admin);
    }

    #[Test]
    public function returns_current_schedule_with_7_days(): void
    {
        $employee = Employee::factory()->create();
        $period = EmploymentPeriod::factory()->create([
            'employee_id' => $employee->id,
            'is_active' => true,
        ]);

        $schedule = EmployeeSchedule::factory()->create([
            'employment_period_id' => $period->id,
            'effective_from' => Carbon::now()->subMonth()->toDateString(),
            'effective_to' => null,
        ]);

        foreach (range(1, 7) as $dow) {
            $schedule->scheduleDays()->create([
                'day_of_week' => $dow,
                'is_day_off' => $dow >= 6,
                'expected_start' => $dow < 6 ? '08:00:00' : null,
                'expected_end' => $dow < 6 ? '17:00:00' : null,
            ]);
        }

        $response = $this->getJson("/api/v1/employees/{$employee->public_id}/current-schedule");

        $response->assertStatus(200)
            ->assertJsonPath('data.workday_type', $schedule->workday_type->value)
            ->assertJsonCount(7, 'data.days');
    }

    #[Test]
    public function returns_404_when_employee_has_no_active_period(): void
    {
        $employee = Employee::factory()->create();
        // No active employment period created

        $response = $this->getJson("/api/v1/employees/{$employee->public_id}/current-schedule");

        $response->assertStatus(404);
    }

    #[Test]
    public function returns_404_when_active_period_has_no_current_schedule(): void
    {
        $employee = Employee::factory()->create();
        EmploymentPeriod::factory()->create([
            'employee_id' => $employee->id,
            'is_active' => true,
        ]);
        // No schedule created for the period

        $response = $this->getJson("/api/v1/employees/{$employee->public_id}/current-schedule");

        $response->assertStatus(404);
    }

    #[Test]
    public function returns_404_when_schedule_is_not_yet_effective(): void
    {
        $employee = Employee::factory()->create();
        $period = EmploymentPeriod::factory()->create([
            'employee_id' => $employee->id,
            'is_active' => true,
        ]);

        EmployeeSchedule::factory()->create([
            'employment_period_id' => $period->id,
            'effective_from' => Carbon::now()->addMonth()->toDateString(), // future
            'effective_to' => null,
        ]);

        $response = $this->getJson("/api/v1/employees/{$employee->public_id}/current-schedule");

        $response->assertStatus(404);
    }

    #[Test]
    public function response_includes_employment_period_id_on_404_without_schedule(): void
    {
        $employee = Employee::factory()->create();
        $period = EmploymentPeriod::factory()->create([
            'employee_id' => $employee->id,
            'is_active' => true,
        ]);

        $response = $this->getJson("/api/v1/employees/{$employee->public_id}/current-schedule");

        $response->assertStatus(404)
            ->assertJsonPath('meta.employment_period_id', $period->public_id);
    }

    #[Test]
    public function returns_403_without_permission(): void
    {
        $user = User::factory()->create();
        Passport::actingAs($user);

        // Employee belongs to a different user → not self-access
        $employee = Employee::factory()->create(['user_id' => User::factory()->create()->id]);

        $response = $this->getJson("/api/v1/employees/{$employee->public_id}/current-schedule");

        $response->assertStatus(403);
    }

    #[Test]
    public function employee_can_access_own_schedule_without_permission(): void
    {
        $user = User::factory()->create();
        // Employee linked to this user — no extra permissions assigned
        $employee = Employee::factory()->create(['user_id' => $user->id]);

        $period = EmploymentPeriod::factory()->create([
            'employee_id' => $employee->id,
            'is_active' => true,
        ]);

        EmployeeSchedule::factory()->create([
            'employment_period_id' => $period->id,
            'effective_from' => Carbon::now()->subMonth()->toDateString(),
            'effective_to' => null,
        ]);

        Passport::actingAs($user);

        $response = $this->getJson("/api/v1/employees/{$employee->public_id}/current-schedule");

        $response->assertStatus(200);
    }
}
