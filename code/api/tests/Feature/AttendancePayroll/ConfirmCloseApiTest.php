<?php

namespace Tests\Feature\AttendancePayroll;

use App\Models\Attendance;
use App\Models\Branch;
use App\Models\Employee;
use App\Models\EmployeeSchedule;
use App\Models\EmploymentPeriod;
use App\Models\PayPeriod;
use App\Models\PayPeriodLine;
use App\Models\ScheduleDay;
use App\Models\User;
use App\Models\WageHistory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class ConfirmCloseApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected Branch $branch;

    protected function setUp(): void
    {
        parent::setUp();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        Permission::create(['name' => 'payroll.close', 'guard_name' => 'api']);

        foreach (Employee::POSITION_ROLES as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);
        }

        $adminRole = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'api']);
        $adminRole->givePermissionTo('payroll.close');

        $this->user = User::factory()->create();
        $this->user->assignRole('admin');
        $this->branch = Branch::factory()->create();

        Passport::actingAs($this->user);
    }

    private function createActiveEmployee(): Employee
    {
        $employee = Employee::factory()->create(['is_active' => true]);

        $employmentPeriod = EmploymentPeriod::factory()->create([
            'employee_id' => $employee->id,
            'branch_id' => $this->branch->id,
            'is_active' => true,
        ]);

        $schedule = EmployeeSchedule::factory()->create([
            'employment_period_id' => $employmentPeriod->id,
            'effective_from' => '2026-06-01',
            'effective_to' => null,
        ]);

        ScheduleDay::factory()->onDayOfWeek(1)->create([
            'employee_schedule_id' => $schedule->id,
        ]);

        WageHistory::factory()->effectiveBetween('2026-06-01')->create([
            'employee_id' => $employee->id,
            'hourly_rate' => 60.00,
            'weekly_scheduled_hours' => 48.0,
        ]);

        Attendance::factory()->create([
            'employee_id' => $employee->id,
            'date' => '2026-06-22',
            'day_status' => 'WORKED',
            'entry_late_seconds' => 0,
            'lunch_late_seconds' => 0,
        ]);

        return $employee;
    }

    public function test_confirm_close_persists_pay_period_and_employee_breakdown(): void
    {
        $this->createActiveEmployee();

        $response = $this->postJson('/api/v1/pay-periods', [
            'branch_id' => $this->branch->id,
            'period_start' => '2026-06-22',
            'period_end' => '2026-06-28',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'status',
                'data' => [
                    'pay_period' => ['id', 'branch_id', 'period_start', 'period_end', 'status', 'closed_at'],
                    'employees_closed',
                ],
            ]);

        $this->assertEquals('CLOSED', $response->json('data.pay_period.status'));
        $this->assertEquals(1, $response->json('data.employees_closed'));

        $this->assertDatabaseCount('pay_periods', 1);
        $this->assertDatabaseCount('pay_period_employees', 1);
        $this->assertGreaterThan(0, PayPeriodLine::count());

        $payPeriod = PayPeriod::first();
        $this->assertTrue($payPeriod->isClosed());
        $this->assertEquals($this->user->id, $payPeriod->closed_by);
        $this->assertNotNull($payPeriod->closed_at);
    }

    public function test_confirm_close_rejects_duplicate_period_for_same_branch(): void
    {
        $this->createActiveEmployee();

        $this->postJson('/api/v1/pay-periods', [
            'branch_id' => $this->branch->id,
            'period_start' => '2026-06-22',
            'period_end' => '2026-06-28',
        ])->assertStatus(201);

        $response = $this->postJson('/api/v1/pay-periods', [
            'branch_id' => $this->branch->id,
            'period_start' => '2026-06-22',
            'period_end' => '2026-06-28',
        ]);

        $response->assertStatus(422);
        $this->assertDatabaseCount('pay_periods', 1);
    }

    public function test_confirm_close_allows_closing_when_an_open_period_exists_for_the_same_range(): void
    {
        $this->createActiveEmployee();

        PayPeriod::create([
            'branch_id' => $this->branch->id,
            'period_start' => '2026-07-06',
            'period_end' => '2026-07-12',
            'status' => PayPeriod::STATUS_OPEN,
        ]);

        $response = $this->postJson('/api/v1/pay-periods', [
            'branch_id' => $this->branch->id,
            'period_start' => '2026-06-22',
            'period_end' => '2026-06-28',
        ]);

        $response->assertStatus(201);
    }

    public function test_confirm_close_returns_422_when_a_non_closed_period_violates_the_unique_constraint(): void
    {
        $this->createActiveEmployee();

        // Bypasses the status-filtered pre-check (only status=CLOSED is checked), but the
        // (branch_id, period_start, period_end) unique index still blocks the insert.
        PayPeriod::create([
            'branch_id' => $this->branch->id,
            'period_start' => '2026-06-22',
            'period_end' => '2026-06-28',
            'status' => PayPeriod::STATUS_OPEN,
        ]);

        $response = $this->postJson('/api/v1/pay-periods', [
            'branch_id' => $this->branch->id,
            'period_start' => '2026-06-22',
            'period_end' => '2026-06-28',
        ]);

        $response->assertStatus(422);
        $this->assertDatabaseCount('pay_periods', 1);
        $this->assertDatabaseCount('pay_period_employees', 0);
    }

    public function test_confirm_close_returns_403_without_permission(): void
    {
        $unprivilegedUser = User::factory()->create();
        Passport::actingAs($unprivilegedUser);

        $this->postJson('/api/v1/pay-periods', [
            'branch_id' => $this->branch->id,
            'period_start' => '2026-06-22',
            'period_end' => '2026-06-28',
        ])->assertStatus(403);
    }

    public function test_confirm_close_returns_422_when_required_fields_missing(): void
    {
        $this->postJson('/api/v1/pay-periods', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['branch_id', 'period_start', 'period_end']);
    }

    public function test_confirm_close_returns_422_when_period_end_before_period_start(): void
    {
        $this->postJson('/api/v1/pay-periods', [
            'branch_id' => $this->branch->id,
            'period_start' => '2026-06-28',
            'period_end' => '2026-06-22',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['period_end']);
    }
}
