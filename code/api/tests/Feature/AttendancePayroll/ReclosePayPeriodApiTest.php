<?php

namespace Tests\Feature\AttendancePayroll;

use App\Models\Attendance;
use App\Models\Branch;
use App\Models\Employee;
use App\Models\EmployeeSchedule;
use App\Models\EmploymentPeriod;
use App\Models\PayPeriod;
use App\Models\PayPeriodEmployee;
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

class ReclosePayPeriodApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected Branch $branch;

    protected function setUp(): void
    {
        parent::setUp();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        Permission::create(['name' => 'payroll.reclose', 'guard_name' => 'api']);

        foreach (Employee::POSITION_ROLES as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);
        }

        $adminRole = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'api']);
        $adminRole->givePermissionTo('payroll.reclose');

        $this->admin = User::factory()->create();
        $this->admin->assignRole('admin');
        $this->branch = Branch::factory()->create();

        Passport::actingAs($this->admin);
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

    private function createReopenedPeriod(): PayPeriod
    {
        $payPeriod = PayPeriod::create([
            'branch_id' => $this->branch->id,
            'period_start' => '2026-06-22',
            'period_end' => '2026-06-28',
            'status' => PayPeriod::STATUS_REOPENED,
            'closed_by' => $this->admin->id,
            'closed_at' => now()->subDay(),
            'reopened_by' => $this->admin->id,
            'reopened_at' => now(),
            'reopen_reason' => 'Corrección de horas',
        ]);

        $payPeriodEmployee = PayPeriodEmployee::create([
            'pay_period_id' => $payPeriod->id,
            'employee_id' => Employee::factory()->create(['is_active' => false])->id,
            'base_pay' => 100,
            'late_deductions' => 0,
            'unpaid_leave_deductions' => 0,
            'overtime_pay' => 0,
            'extra_day_pay' => 0,
            'punctuality_bonus' => 0,
            'holiday_pay' => 0,
            'other_adjustments' => 0,
            'total_pay' => 100,
            'free_hours_earned' => 0,
        ]);

        PayPeriodLine::create([
            'pay_period_employee_id' => $payPeriodEmployee->id,
            'date' => '2026-06-22',
            'concept' => PayPeriodLine::CONCEPT_BASE_PAY,
            'description' => 'Stale line from before reopen',
            'amount' => 100,
            'minutes' => 480,
        ]);

        return $payPeriod;
    }

    public function test_admin_can_reclose_a_reopened_period_and_recalculates_totals(): void
    {
        $this->createActiveEmployee();
        $payPeriod = $this->createReopenedPeriod();
        $staleEmployeeRowId = $payPeriod->payPeriodEmployees()->first()->id;

        $response = $this->patchJson("/api/v1/pay-periods/{$payPeriod->public_id}/reclose");

        $response->assertStatus(200);
        $this->assertEquals('CLOSED', $response->json('data.status'));

        $payPeriod->refresh();
        $this->assertTrue($payPeriod->isClosed());
        $this->assertEquals($this->admin->id, $payPeriod->closed_by);
        $this->assertNotNull($payPeriod->closed_at);

        // Reopening metadata stays visible in the header after reclosing
        $this->assertEquals('Corrección de horas', $payPeriod->reopen_reason);
        $this->assertNotNull($payPeriod->reopened_at);

        // Stale rows from before the reopen are gone, replaced by a fresh recalculation
        $this->assertDatabaseMissing('pay_period_employees', ['id' => $staleEmployeeRowId]);
        $this->assertDatabaseCount('pay_period_employees', 1);
        $this->assertGreaterThan(0, PayPeriodLine::count());
    }

    public function test_manager_cannot_reclose_a_period(): void
    {
        $manager = User::factory()->create();
        $manager->assignRole('manager');
        Passport::actingAs($manager);

        $payPeriod = $this->createReopenedPeriod();

        $this->patchJson("/api/v1/pay-periods/{$payPeriod->public_id}/reclose")
            ->assertStatus(403);

        $payPeriod->refresh();
        $this->assertEquals(PayPeriod::STATUS_REOPENED, $payPeriod->status);
    }

    public function test_reclose_rejects_a_period_that_is_not_reopened(): void
    {
        $payPeriod = PayPeriod::create([
            'branch_id' => $this->branch->id,
            'period_start' => '2026-06-22',
            'period_end' => '2026-06-28',
            'status' => PayPeriod::STATUS_CLOSED,
            'closed_by' => $this->admin->id,
            'closed_at' => now(),
        ]);

        $this->patchJson("/api/v1/pay-periods/{$payPeriod->public_id}/reclose")
            ->assertStatus(422);
    }

    public function test_reclose_returns_404_for_unknown_period(): void
    {
        $this->patchJson('/api/v1/pay-periods/01JUNKNOWNULIDDOESNOTEXIST/reclose')
            ->assertStatus(404);
    }
}
