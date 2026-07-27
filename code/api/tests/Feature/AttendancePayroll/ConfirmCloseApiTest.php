<?php

namespace Tests\Feature\AttendancePayroll;

use App\Enums\OvertimeValuationMethod;
use App\Models\Attendance;
use App\Models\Branch;
use App\Models\Employee;
use App\Models\EmployeeSchedule;
use App\Models\EmploymentPeriod;
use App\Models\OvertimeBankMovement;
use App\Models\PayPeriod;
use App\Models\PayPeriodLine;
use App\Models\ScheduleDay;
use App\Models\User;
use App\Models\WageHistory;
use Carbon\Carbon;
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

        // All pre-existing tests below target the fixed 2026-06-22..2026-06-28 week (Mon-Sun).
        // Pin "now" to Sunday 20:00 in the business timezone so they clear the Sunday-19:00 gate.
        Carbon::setTestNow(Carbon::parse('2026-06-28 20:00:00', 'America/Mexico_City'));
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow(null);
        parent::tearDown();
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

    public function test_confirm_close_creates_paid_overtime_movement_for_authorized_overtime(): void
    {
        $employee = $this->createActiveEmployee();
        $manager = User::factory()->create();

        $attendance = Attendance::where('employee_id', $employee->id)->first();
        $attendance->update([
            'overtime_minutes' => 60,
            'overtime_authorized' => true,
            'overtime_authorized_by' => $manager->id,
            'overtime_authorized_at' => now(),
            'overtime_valuation_method' => OvertimeValuationMethod::AGREED_RATE->value,
            'overtime_rate_applied' => 90.00,
            'overtime_amount' => 90.00,
        ]);

        OvertimeBankMovement::factory()->earned()->create([
            'employee_id' => $employee->id,
            'attendance_id' => $attendance->id,
            'date' => $attendance->date,
            'minutes' => 60,
        ]);

        $response = $this->postJson('/api/v1/pay-periods', [
            'branch_id' => $this->branch->id,
            'period_start' => '2026-06-22',
            'period_end' => '2026-06-28',
        ]);

        $response->assertStatus(201);

        $this->assertDatabaseCount('overtime_bank_movements', 2);
        $this->assertDatabaseHas('overtime_bank_movements', [
            'employee_id' => $employee->id,
            'attendance_id' => $attendance->id,
            'movement_type' => 'PAID',
            'minutes' => 60,
            'amount' => 90.00,
            'authorized_by' => $manager->id,
        ]);
    }

    public function test_confirm_close_does_not_create_paid_movement_for_unauthorized_overtime(): void
    {
        $employee = $this->createActiveEmployee();

        $attendance = Attendance::where('employee_id', $employee->id)->first();
        $attendance->update(['overtime_minutes' => 60]);

        OvertimeBankMovement::factory()->earned()->create([
            'employee_id' => $employee->id,
            'attendance_id' => $attendance->id,
            'date' => $attendance->date,
            'minutes' => 60,
        ]);

        $this->postJson('/api/v1/pay-periods', [
            'branch_id' => $this->branch->id,
            'period_start' => '2026-06-22',
            'period_end' => '2026-06-28',
        ])->assertStatus(201);

        $this->assertDatabaseCount('overtime_bank_movements', 1);
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

    public function test_confirm_close_returns_actionable_message_when_period_is_reopened(): void
    {
        $this->createActiveEmployee();

        PayPeriod::create([
            'branch_id' => $this->branch->id,
            'period_start' => '2026-06-22',
            'period_end' => '2026-06-28',
            'status' => PayPeriod::STATUS_REOPENED,
            'reopen_reason' => 'Corrección de horas',
            'reopened_at' => now(),
        ]);

        $response = $this->postJson('/api/v1/pay-periods', [
            'branch_id' => $this->branch->id,
            'period_start' => '2026-06-22',
            'period_end' => '2026-06-28',
        ]);

        $response->assertStatus(422);
        $response->assertJsonFragment(['period_start' => ["Este periodo fue reabierto — usa 'Volver a cerrar' para cerrarlo nuevamente."]]);
        $this->assertDatabaseCount('pay_periods', 1);
        $this->assertDatabaseCount('pay_period_employees', 0);
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

    public function test_confirm_close_rejects_a_datetime_with_offset_instead_of_a_plain_date(): void
    {
        $response = $this->postJson('/api/v1/pay-periods', [
            'branch_id' => $this->branch->id,
            'period_start' => '2026-06-22T00:00:00-06:00',
            'period_end' => '2026-06-28',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['period_start']);
        $this->assertDatabaseCount('pay_periods', 0);
    }

    public function test_confirm_close_rejects_close_before_sunday_1900(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-28 18:59:00', 'America/Mexico_City'));

        $response = $this->postJson('/api/v1/pay-periods', [
            'branch_id' => $this->branch->id,
            'period_start' => '2026-06-22',
            'period_end' => '2026-06-28',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['period_start']);
        $this->assertDatabaseCount('pay_periods', 0);
    }

    public function test_confirm_close_allows_close_exactly_at_sunday_1900(): void
    {
        $this->createActiveEmployee();
        Carbon::setTestNow(Carbon::parse('2026-06-28 19:00:00', 'America/Mexico_City'));

        $this->postJson('/api/v1/pay-periods', [
            'branch_id' => $this->branch->id,
            'period_start' => '2026-06-22',
            'period_end' => '2026-06-28',
        ])->assertStatus(201);
    }

    public function test_confirm_close_allows_closing_a_week_that_was_missed_weeks_ago(): void
    {
        // The gate has no upper bound — an overdue week (e.g. payroll close was skipped that
        // Sunday) must stay closeable whenever someone finally gets to it, not just within a
        // narrow window right after its own Sunday 19:00.
        $this->createActiveEmployee();
        Carbon::setTestNow(Carbon::parse('2026-07-15 10:00:00', 'America/Mexico_City'));

        $this->postJson('/api/v1/pay-periods', [
            'branch_id' => $this->branch->id,
            'period_start' => '2026-06-22',
            'period_end' => '2026-06-28',
        ])->assertStatus(201);
    }

    public function test_confirm_close_rejects_period_start_that_is_not_a_monday(): void
    {
        $response = $this->postJson('/api/v1/pay-periods', [
            'branch_id' => $this->branch->id,
            'period_start' => '2026-06-23',
            'period_end' => '2026-06-29',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['period_start']);
        $this->assertDatabaseCount('pay_periods', 0);
    }

    public function test_confirm_close_rejects_period_end_that_is_not_the_following_sunday(): void
    {
        $response = $this->postJson('/api/v1/pay-periods', [
            'branch_id' => $this->branch->id,
            'period_start' => '2026-06-22',
            'period_end' => '2026-06-27',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['period_start']);
        $this->assertDatabaseCount('pay_periods', 0);
    }
}
