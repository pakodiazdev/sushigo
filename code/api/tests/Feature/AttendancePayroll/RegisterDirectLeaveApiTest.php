<?php

namespace Tests\Feature\AttendancePayroll;

use App\Enums\DayStatus;
use App\Enums\LeaveStatus;
use App\Models\Attendance;
use App\Models\Employee;
use App\Models\EmploymentPeriod;
use App\Models\Leave;
use App\Models\LeaveType;
use App\Models\PayPeriod;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class RegisterDirectLeaveApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    private const DATE = '2026-04-09';

    protected function setUp(): void
    {
        parent::setUp();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        Permission::create(['name' => 'attendances.create', 'guard_name' => 'api']);
        Permission::create(['name' => 'leaves.register-direct', 'guard_name' => 'api']);
        $role = Role::create(['name' => 'manager', 'guard_name' => 'api']);
        $role->givePermissionTo('attendances.create');
        $role->givePermissionTo('leaves.register-direct');

        Role::firstOrCreate(['name' => 'employee', 'guard_name' => 'api']);
        foreach (Employee::POSITION_ROLES as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);
        }

        $this->user = User::factory()->create();
        $this->user->assignRole('manager');

        Passport::actingAs($this->user);

        // Seed default leave types directly
        $this->seedLeaveTypes();

        Carbon::setTestNow(Carbon::parse(self::DATE.' 10:00:00'));
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    // ── Happy path ────────────────────────────────────────────────────────────

    #[Test]
    public function registers_full_day_fixed_percentage_leave_and_creates_attendance(): void
    {
        $employee = $this->makeEmployee();
        $leaveType = LeaveType::where('code', LeaveType::MEDICAL)->first();

        $response = $this->postJson('/api/v1/leaves', [
            'employee_id' => $employee->public_id,
            'leave_type_id' => $leaveType->id,
            'dates' => [self::DATE],
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.status', LeaveStatus::APPROVED->value)
            ->assertJsonPath('data.resolved_pay_percentage', 0)
            ->assertJsonPath('data.resolved_rest_day_factor', 'NONE')
            ->assertJsonPath('data.leave_type.code', LeaveType::MEDICAL)
            ->assertJsonPath('data.dates', [self::DATE]);

        $this->assertDatabaseHas('leaves', [
            'employee_id' => $employee->id,
            'start_date' => self::DATE,
            'status' => LeaveStatus::APPROVED->value,
        ]);

        $this->assertDatabaseHas('attendances', [
            'employee_id' => $employee->id,
            'date' => self::DATE,
            'day_status' => DayStatus::LEAVE->value,
        ]);
    }

    #[Test]
    public function registers_multi_day_leave_and_creates_attendance_for_each_day(): void
    {
        $employee = $this->makeEmployee();
        $leaveType = LeaveType::where('code', LeaveType::MEDICAL)->first();

        $response = $this->postJson('/api/v1/leaves', [
            'employee_id' => $employee->public_id,
            'leave_type_id' => $leaveType->id,
            'dates' => ['2026-04-09', '2026-04-10', '2026-04-11'],
        ]);

        $response->assertStatus(201);

        foreach (['2026-04-09', '2026-04-10', '2026-04-11'] as $date) {
            $this->assertDatabaseHas('attendances', [
                'employee_id' => $employee->id,
                'date' => $date,
                'day_status' => DayStatus::LEAVE->value,
            ]);
        }
    }

    #[Test]
    public function registers_leave_for_non_contiguous_days_and_only_creates_attendance_for_those_days(): void
    {
        $employee = $this->makeEmployee();
        $leaveType = LeaveType::where('code', LeaveType::MEDICAL)->first();

        // Monday + Wednesday, skipping Tuesday
        $response = $this->postJson('/api/v1/leaves', [
            'employee_id' => $employee->public_id,
            'leave_type_id' => $leaveType->id,
            'dates' => ['2026-04-13', '2026-04-15'],
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.start_date', '2026-04-13')
            ->assertJsonPath('data.end_date', '2026-04-15')
            ->assertJsonPath('data.dates', ['2026-04-13', '2026-04-15']);

        $this->assertDatabaseHas('attendances', [
            'employee_id' => $employee->id,
            'date' => '2026-04-13',
            'day_status' => DayStatus::LEAVE->value,
        ]);
        $this->assertDatabaseHas('attendances', [
            'employee_id' => $employee->id,
            'date' => '2026-04-15',
            'day_status' => DayStatus::LEAVE->value,
        ]);
        // The skipped day in between must NOT have been touched.
        $this->assertDatabaseMissing('attendances', [
            'employee_id' => $employee->id,
            'date' => '2026-04-14',
        ]);
    }

    #[Test]
    public function pay_percentage_override_is_stored_and_returned(): void
    {
        $employee = $this->makeEmployee();
        $leaveType = LeaveType::where('code', LeaveType::MEDICAL)->first();

        $response = $this->postJson('/api/v1/leaves', [
            'employee_id' => $employee->public_id,
            'leave_type_id' => $leaveType->id,
            'dates' => [self::DATE],
            'pay_percentage' => 30.00,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.resolved_pay_percentage', 30);

        $this->assertDatabaseHas('leaves', [
            'employee_id' => $employee->id,
            'pay_percentage' => '30.00',
        ]);
    }

    #[Test]
    public function registers_proportional_hours_leave_with_scheduled_mode_without_attendance_record(): void
    {
        $employee = $this->makeEmployee();
        $leaveType = LeaveType::where('code', LeaveType::PERMISSION_HOURS)->first();

        $response = $this->postJson('/api/v1/leaves', [
            'employee_id' => $employee->public_id,
            'leave_type_id' => $leaveType->id,
            'dates' => [self::DATE],
            'time_mode' => 'SCHEDULED',
            'scheduled_start_time' => '14:00',
            'scheduled_end_time' => '16:00',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.time_mode', 'SCHEDULED')
            ->assertJsonPath('data.computed_duration_minutes', 120);

        // SCHEDULED (partial) leaves never create an Attendance record — the
        // employee is still expected to check in/out normally that day.
        $this->assertDatabaseMissing('attendances', [
            'employee_id' => $employee->id,
            'date' => self::DATE,
        ]);
    }

    #[Test]
    public function registers_proportional_hours_leave_with_open_ended_mode_and_creates_attendance(): void
    {
        $employee = $this->makeEmployee();
        $leaveType = LeaveType::where('code', LeaveType::PERMISSION_HOURS)->first();

        $response = $this->postJson('/api/v1/leaves', [
            'employee_id' => $employee->public_id,
            'leave_type_id' => $leaveType->id,
            'dates' => [self::DATE],
            'time_mode' => 'OPEN_ENDED',
            'scheduled_start_time' => '15:00',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.time_mode', 'OPEN_ENDED')
            ->assertJsonPath('data.scheduled_end_time', null);

        // OPEN_ENDED leaves have no defined end time — treated like the rest
        // of the day is absent, so an Attendance LEAVE record is created.
        $this->assertDatabaseHas('attendances', [
            'employee_id' => $employee->id,
            'date' => self::DATE,
            'day_status' => DayStatus::LEAVE->value,
        ]);
    }

    #[Test]
    public function registers_scheduled_leave_even_if_employee_already_checked_in(): void
    {
        $employee = $this->makeEmployee();
        $leaveType = LeaveType::where('code', LeaveType::PERMISSION_HOURS)->first();

        // Employee already checked in today (day_status = WORKED) — express
        // "leave early" flow: the manager registers a SCHEDULED partial leave
        // for the remainder of the day without it being blocked.
        Attendance::create([
            'employee_id' => $employee->id,
            'date' => self::DATE,
            'day_status' => DayStatus::WORKED,
            'check_in' => now(),
        ]);

        $response = $this->postJson('/api/v1/leaves', [
            'employee_id' => $employee->public_id,
            'leave_type_id' => $leaveType->id,
            'dates' => [self::DATE],
            'time_mode' => 'SCHEDULED',
            'scheduled_start_time' => '14:00',
            'scheduled_end_time' => '16:00',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.time_mode', 'SCHEDULED');

        // The existing WORKED attendance must be left untouched.
        $this->assertDatabaseHas('attendances', [
            'employee_id' => $employee->id,
            'date' => self::DATE,
            'day_status' => DayStatus::WORKED->value,
        ]);
    }

    #[Test]
    public function actual_times_compute_duration_minutes(): void
    {
        $employee = $this->makeEmployee();
        $leaveType = LeaveType::where('code', LeaveType::PERMISSION_HOURS)->first();

        $response = $this->postJson('/api/v1/leaves', [
            'employee_id' => $employee->public_id,
            'leave_type_id' => $leaveType->id,
            'dates' => [self::DATE],
            'time_mode' => 'SCHEDULED',
            'scheduled_start_time' => '14:00',
            'scheduled_end_time' => '16:00',
            'actual_start_time' => '14:05',
            'actual_end_time' => '16:10',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.actual_duration_minutes', 125);
    }

    // ── Guard: overlapping leave ──────────────────────────────────────────────

    #[Test]
    public function rejects_leave_if_approved_leave_already_covers_date(): void
    {
        $employee = $this->makeEmployee();
        $leaveType = LeaveType::where('code', LeaveType::MEDICAL)->first();

        // Pre-existing approved leave
        Leave::factory()->create([
            'employee_id' => $employee->id,
            'leave_type_id' => $leaveType->id,
            'start_date' => self::DATE,
            'end_date' => self::DATE,
            'status' => LeaveStatus::APPROVED,
            'requested_by' => $this->user->id,
            'approved_by' => $this->user->id,
            'approved_at' => now(),
        ]);

        $response = $this->postJson('/api/v1/leaves', [
            'employee_id' => $employee->public_id,
            'leave_type_id' => $leaveType->id,
            'dates' => [self::DATE],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrorFor('dates');
    }

    // ── Guard: check-in blocked ───────────────────────────────────────────────

    #[Test]
    public function blocks_check_in_after_approved_leave_is_registered(): void
    {
        $employee = $this->makeEmployee();
        $leaveType = LeaveType::where('code', LeaveType::MEDICAL)->first();

        // Register the leave
        $this->postJson('/api/v1/leaves', [
            'employee_id' => $employee->public_id,
            'leave_type_id' => $leaveType->id,
            'dates' => [self::DATE],
        ])->assertStatus(201);

        // Attempt check-in on the same day
        $response = $this->postJson('/api/v1/attendances/check-in', [
            'employee_id' => $employee->public_id,
            'check_in' => self::DATE.'T09:00:00-06:00',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrorFor('check_in');
    }

    #[Test]
    public function does_not_block_check_in_on_the_gap_day_of_a_non_contiguous_leave(): void
    {
        $employee = $this->makeEmployee();
        $leaveType = LeaveType::where('code', LeaveType::MEDICAL)->first();

        // Leave covers 2026-04-13 and 2026-04-15, but NOT 2026-04-14 — even
        // though 04-14 falls within the start_date/end_date bounding range.
        $this->postJson('/api/v1/leaves', [
            'employee_id' => $employee->public_id,
            'leave_type_id' => $leaveType->id,
            'dates' => ['2026-04-13', '2026-04-15'],
        ])->assertStatus(201);

        $this->assertTrue(Leave::where('employee_id', $employee->id)->forDate('2026-04-13')->exists());
        $this->assertTrue(Leave::where('employee_id', $employee->id)->forDate('2026-04-15')->exists());
        $this->assertFalse(Leave::where('employee_id', $employee->id)->forDate('2026-04-14')->exists());

        // The check-in guard uses the same scope, so it must not block 04-14.
        // Same-day check-in only (retroactive check-in requires admin), so
        // advance "now" to just after the check-in instant (15:00 UTC).
        Carbon::setTestNow(Carbon::parse('2026-04-14 15:05:00'));

        $response = $this->postJson('/api/v1/attendances/check-in', [
            'employee_id' => $employee->public_id,
            'check_in' => '2026-04-14T09:00:00-06:00',
        ]);

        $response->assertStatus(422);
        $this->assertArrayNotHasKey('check_in', $response->json('errors') ?? []);
    }

    // ── Validation ────────────────────────────────────────────────────────────

    #[Test]
    public function rejects_proportional_hours_leave_without_time_mode(): void
    {
        $employee = $this->makeEmployee();
        $leaveType = LeaveType::where('code', LeaveType::PERMISSION_HOURS)->first();

        $response = $this->postJson('/api/v1/leaves', [
            'employee_id' => $employee->public_id,
            'leave_type_id' => $leaveType->id,
            'dates' => [self::DATE],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrorFor('time_mode');
    }

    #[Test]
    public function rejects_scheduled_mode_without_end_time(): void
    {
        $employee = $this->makeEmployee();
        $leaveType = LeaveType::where('code', LeaveType::PERMISSION_HOURS)->first();

        $response = $this->postJson('/api/v1/leaves', [
            'employee_id' => $employee->public_id,
            'leave_type_id' => $leaveType->id,
            'dates' => [self::DATE],
            'time_mode' => 'SCHEDULED',
            'scheduled_start_time' => '14:00',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrorFor('scheduled_end_time');
    }

    #[Test]
    public function rejects_proportional_hours_leave_spanning_multiple_days(): void
    {
        $employee = $this->makeEmployee();
        $leaveType = LeaveType::where('code', LeaveType::PERMISSION_HOURS)->first();

        $response = $this->postJson('/api/v1/leaves', [
            'employee_id' => $employee->public_id,
            'leave_type_id' => $leaveType->id,
            'dates' => ['2026-04-09', '2026-04-10'],
            'time_mode' => 'SCHEDULED',
            'scheduled_start_time' => '14:00',
            'scheduled_end_time' => '16:00',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrorFor('dates');
    }

    // ── Guard: existing worked attendance ────────────────────────────────────

    #[Test]
    public function rejects_leave_if_employee_already_has_worked_attendance(): void
    {
        $employee = $this->makeEmployee();
        $leaveType = LeaveType::where('code', LeaveType::MEDICAL)->first();

        // Pre-existing WORKED attendance (employee already checked in)
        Attendance::create([
            'employee_id' => $employee->id,
            'date' => self::DATE,
            'day_status' => DayStatus::WORKED,
            'check_in' => now(),
        ]);

        $response = $this->postJson('/api/v1/leaves', [
            'employee_id' => $employee->public_id,
            'leave_type_id' => $leaveType->id,
            'dates' => [self::DATE],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrorFor('dates');
    }

    #[Test]
    public function rejects_leave_for_multi_day_range_with_one_worked_attendance(): void
    {
        $employee = $this->makeEmployee();
        $leaveType = LeaveType::where('code', LeaveType::MEDICAL)->first();

        Attendance::create([
            'employee_id' => $employee->id,
            'date' => '2026-04-10',
            'day_status' => DayStatus::WORKED,
            'check_in' => now(),
        ]);

        $response = $this->postJson('/api/v1/leaves', [
            'employee_id' => $employee->public_id,
            'leave_type_id' => $leaveType->id,
            'dates' => ['2026-04-09', '2026-04-10', '2026-04-11'],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrorFor('dates');
    }

    // ── Validation: time ordering ─────────────────────────────────────────────

    #[Test]
    public function rejects_scheduled_end_time_before_start_time(): void
    {
        $employee = $this->makeEmployee();
        $leaveType = LeaveType::where('code', LeaveType::PERMISSION_HOURS)->first();

        $response = $this->postJson('/api/v1/leaves', [
            'employee_id' => $employee->public_id,
            'leave_type_id' => $leaveType->id,
            'dates' => [self::DATE],
            'time_mode' => 'SCHEDULED',
            'scheduled_start_time' => '16:00',
            'scheduled_end_time' => '14:00',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrorFor('scheduled_end_time');
    }

    // ── Closed pay period ─────────────────────────────────────────────────────

    #[Test]
    public function rejects_leave_when_date_is_covered_by_a_closed_pay_period(): void
    {
        $employee = $this->makeEmployee();
        $leaveType = LeaveType::where('code', LeaveType::MEDICAL)->first();

        PayPeriod::create([
            'branch_id' => $employee->employmentPeriods()->first()->branch_id,
            'period_start' => '2026-04-06',
            'period_end' => '2026-04-12',
            'status' => PayPeriod::STATUS_CLOSED,
        ]);

        $response = $this->postJson('/api/v1/leaves', [
            'employee_id' => $employee->public_id,
            'leave_type_id' => $leaveType->id,
            'dates' => [self::DATE],
        ]);

        $response->assertStatus(422);
        $this->assertArrayHasKey('dates', $response->json('errors'));
    }

    #[Test]
    public function rejects_multi_day_leave_when_any_date_is_covered_by_a_closed_pay_period(): void
    {
        $employee = $this->makeEmployee();
        $leaveType = LeaveType::where('code', LeaveType::MEDICAL)->first();

        // self::DATE (2026-04-09) is NOT covered; only 2026-04-12 falls inside the closed period
        PayPeriod::create([
            'branch_id' => $employee->employmentPeriods()->first()->branch_id,
            'period_start' => '2026-04-10',
            'period_end' => '2026-04-16',
            'status' => PayPeriod::STATUS_CLOSED,
        ]);

        $response = $this->postJson('/api/v1/leaves', [
            'employee_id' => $employee->public_id,
            'leave_type_id' => $leaveType->id,
            'dates' => [self::DATE, '2026-04-12'],
        ]);

        $response->assertStatus(422);
        $this->assertArrayHasKey('dates', $response->json('errors'));
    }

    // ── Auth ──────────────────────────────────────────────────────────────────

    #[Test]
    public function rejects_unauthenticated_request(): void
    {
        auth()->forgetGuards();

        $this->postJson('/api/v1/leaves', [
            'employee_id' => 'any-id',
            'leave_type_id' => 1,
            'dates' => [self::DATE],
        ])->assertStatus(401);
    }

    #[Test]
    public function rejects_request_without_leaves_register_direct_permission(): void
    {
        $userWithoutPermission = User::factory()->create();
        Passport::actingAs($userWithoutPermission);

        $this->postJson('/api/v1/leaves', [
            'employee_id' => 'any-id',
            'leave_type_id' => 1,
            'dates' => [self::DATE],
        ])->assertStatus(403);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function seedLeaveTypes(): void
    {
        $types = [
            [LeaveType::MEDICAL, 'Incapacidad médica', 'FIXED_PERCENTAGE', 0.00, 'NONE', false],
            [LeaveType::PERSONAL, 'Permiso personal', 'FIXED_PERCENTAGE', 0.00, 'NONE', false],
            ['PERMISSION_PAID', 'Permiso con goce de sueldo', 'FIXED_PERCENTAGE', 100.00, 'FULL', true],
            [LeaveType::PERMISSION_HOURS, 'Permiso por horas', 'PROPORTIONAL_HOURS', 0.00, 'PROPORTIONAL', false],
        ];

        foreach ($types as [$code, $name, $mode, $pay, $rest, $bonus]) {
            LeaveType::create([
                'code' => $code,
                'name' => $name,
                'calculation_mode' => $mode,
                'default_pay_percentage' => $pay,
                'default_rest_day_factor' => $rest,
                'counts_for_bonus' => $bonus,
            ]);
        }
    }

    private function makeEmployee(): Employee
    {
        $period = EmploymentPeriod::factory()->create([
            'is_active' => true,
            'start_date' => '2026-01-01',
        ]);

        return $period->employee;
    }
}
