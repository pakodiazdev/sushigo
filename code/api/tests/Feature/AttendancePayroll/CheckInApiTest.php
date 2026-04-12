<?php

namespace Tests\Feature\AttendancePayroll;

use App\Models\Attendance;
use App\Models\Employee;
use App\Models\EmployeeSchedule;
use App\Models\EmploymentPeriod;
use App\Models\ScheduleDay;
use App\Models\ScheduleDayOverride;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class CheckInApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    /** Monday 2026-02-23 at 09:00:00 (ISO dow = 1) */
    private const DATE = '2026-02-23';

    private const CHECK_IN = '2026-02-23T09:00:00';

    private const START = '09:00:00';

    /** Sunday 2026-02-22 (ISO dow = 7) — used for override tests */
    private const SUNDAY_DATE = '2026-02-22';

    private const SUNDAY_CHECK_IN = '2026-02-22T13:00:00';

    protected function setUp(): void
    {
        parent::setUp();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        Permission::create(['name' => 'attendances.create', 'guard_name' => 'api']);
        $role = Role::create(['name' => 'manager', 'guard_name' => 'api']);
        $role->givePermissionTo('attendances.create');

        // Position roles required by Employee factory
        Role::firstOrCreate(['name' => 'employee',         'guard_name' => 'api']);
        Role::firstOrCreate(['name' => 'employee-manager', 'guard_name' => 'api']);
        foreach (Employee::POSITION_ROLES as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);
        }

        $this->user = User::factory()->create();
        $this->user->assignRole('manager');

        Passport::actingAs($this->user);
    }

    #[Test]
    public function registers_on_time_check_in(): void
    {
        ['employee' => $employee] = $this->makeEmployeeWithSchedule(
            date: self::DATE,
            expectedStart: self::START,
        );

        $response = $this->postJson('/api/v1/attendances/check-in', [
            'employee_id' => $employee->public_id,
            'check_in' => self::CHECK_IN,  // exactly on time
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.entry_late_seconds', 0)
            ->assertJsonPath('data.entry_late_minutes', 0)
            ->assertJsonPath('data.is_entry_deductible', false)
            ->assertJsonPath('data.day_status', 'WORKED');
    }

    #[Test]
    public function registers_late_check_in_under_30_min(): void
    {
        ['employee' => $employee] = $this->makeEmployeeWithSchedule(
            date: self::DATE,
            expectedStart: self::START,
        );

        // 15 minutes (900 seconds) late — under 30-min deductible threshold
        $response = $this->postJson('/api/v1/attendances/check-in', [
            'employee_id' => $employee->public_id,
            'check_in' => '2026-02-23T09:15:00',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.entry_late_seconds', 900)
            ->assertJsonPath('data.entry_late_minutes', 15)
            ->assertJsonPath('data.is_entry_deductible', false);
    }

    #[Test]
    public function registers_late_check_in_over_30_min(): void
    {
        ['employee' => $employee] = $this->makeEmployeeWithSchedule(
            date: self::DATE,
            expectedStart: self::START,
        );

        // 35 minutes (2100 seconds) late — exceeds deductible threshold
        $response = $this->postJson('/api/v1/attendances/check-in', [
            'employee_id' => $employee->public_id,
            'check_in' => '2026-02-23T09:35:00',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.entry_late_seconds', 2100)
            ->assertJsonPath('data.entry_late_minutes', 35)
            ->assertJsonPath('data.is_entry_deductible', true);
    }

    #[Test]
    public function early_arrival_records_zero_late_seconds(): void
    {
        ['employee' => $employee] = $this->makeEmployeeWithSchedule(
            date: self::DATE,
            expectedStart: self::START,
        );

        // 10 minutes early — should record 0 late seconds
        $response = $this->postJson('/api/v1/attendances/check-in', [
            'employee_id' => $employee->public_id,
            'check_in' => '2026-02-23T08:50:00',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.entry_late_seconds', 0)
            ->assertJsonPath('data.is_entry_deductible', false);
    }

    #[Test]
    public function returns_correct_response_structure(): void
    {
        ['employee' => $employee] = $this->makeEmployeeWithSchedule(
            date: self::DATE,
            expectedStart: self::START,
        );

        $response = $this->postJson('/api/v1/attendances/check-in', [
            'employee_id' => $employee->public_id,
            'check_in' => self::CHECK_IN,
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'status',
                'data' => [
                    'id',
                    'employee_id',
                    'date',
                    'check_in',
                    'entry_late_seconds',
                    'entry_late_minutes',
                    'is_entry_deductible',
                    'day_status',
                    'created_at',
                ],
            ]);

        $this->assertEquals(26, strlen($response->json('data.id')));
        $this->assertEquals(self::DATE, $response->json('data.date'));
    }

    // #region 422 error cases

    #[Test]
    public function rejects_duplicate_attendance(): void
    {
        ['employee' => $employee] = $this->makeEmployeeWithSchedule(
            date: self::DATE,
            expectedStart: self::START,
        );

        $this->postJson('/api/v1/attendances/check-in', [
            'employee_id' => $employee->public_id,
            'check_in' => self::CHECK_IN,
        ])->assertStatus(201);

        $response = $this->postJson('/api/v1/attendances/check-in', [
            'employee_id' => $employee->public_id,
            'check_in' => self::CHECK_IN,
        ]);

        $response->assertStatus(422);
        $this->assertArrayHasKey('check_in', $response->json('errors'));
    }

    #[Test]
    public function rejects_when_no_active_employment_period(): void
    {
        // Employee with no employment period
        $employee = Employee::factory()->create();

        $response = $this->postJson('/api/v1/attendances/check-in', [
            'employee_id' => $employee->public_id,
            'check_in' => self::CHECK_IN,
        ]);

        $response->assertStatus(422);
        $this->assertArrayHasKey('employee_id', $response->json('errors'));
    }

    #[Test]
    public function rejects_when_no_active_schedule(): void
    {
        // Employment period exists but no schedule assigned
        $period = EmploymentPeriod::factory()->create([
            'is_active' => true,
            'start_date' => '2026-01-01',
        ]);
        $employee = $period->employee;

        $response = $this->postJson('/api/v1/attendances/check-in', [
            'employee_id' => $employee->public_id,
            'check_in' => self::CHECK_IN,
        ]);

        $response->assertStatus(422);
        $this->assertArrayHasKey('employee_id', $response->json('errors'));
    }

    #[Test]
    public function rejects_when_no_schedule_day_configured_for_day_of_week(): void
    {
        $period = EmploymentPeriod::factory()->create([
            'is_active' => true,
            'start_date' => '2026-01-01',
        ]);
        $employee = $period->employee;

        // Schedule exists but only has Saturday (6) — no Monday (1) entry
        $schedule = EmployeeSchedule::factory()->current()->create([
            'employment_period_id' => $period->id,
            'effective_from' => '2026-01-01',
        ]);
        ScheduleDay::factory()->saturday()->workDay()->create([
            'employee_schedule_id' => $schedule->id,
        ]);

        // Check-in is on Monday 2026-02-23 (dow=1) — not configured
        $response = $this->postJson('/api/v1/attendances/check-in', [
            'employee_id' => $employee->public_id,
            'check_in' => self::CHECK_IN,
        ]);

        $response->assertStatus(422);
        $this->assertArrayHasKey('check_in', $response->json('errors'));
    }

    #[Test]
    public function rejects_when_schedule_day_is_day_off(): void
    {
        $period = EmploymentPeriod::factory()->create([
            'is_active' => true,
            'start_date' => '2026-01-01',
        ]);
        $employee = $period->employee;

        $schedule = EmployeeSchedule::factory()->current()->create([
            'employment_period_id' => $period->id,
            'effective_from' => '2026-01-01',
        ]);

        // Monday (1) is configured as day off
        ScheduleDay::factory()->monday()->dayOff()->create([
            'employee_schedule_id' => $schedule->id,
        ]);

        $response = $this->postJson('/api/v1/attendances/check-in', [
            'employee_id' => $employee->public_id,
            'check_in' => self::CHECK_IN,
        ]);

        $response->assertStatus(422);
        $this->assertArrayHasKey('check_in', $response->json('errors'));
    }

    // #endregion

    // #region ScheduleDayOverride precedence

    #[Test]
    public function allows_check_in_on_rest_day_when_active_override_marks_it_as_working(): void
    {
        // Regression test for: check-in was rejected even when a ScheduleDayOverride
        // explicitly marked the normally-off day as a working day.
        //
        // Scenario:  Sunday (dow=7) is day_off in the base schedule.
        //            A single-date override flips it to is_day_off=false for 2026-02-22.
        //            The check-in must succeed with HTTP 201.
        $period = EmploymentPeriod::factory()->create([
            'is_active' => true,
            'start_date' => '2026-01-01',
        ]);
        $employee = $period->employee;

        $schedule = EmployeeSchedule::factory()->current()->create([
            'employment_period_id' => $period->id,
            'effective_from' => '2026-01-01',
        ]);

        // Base schedule: Sunday is a rest day
        ScheduleDay::factory()->onDayOfWeek(7)->dayOff()->create([
            'employee_schedule_id' => $schedule->id,
        ]);

        // Override: Sunday 2026-02-22 is treated as a working day
        ScheduleDayOverride::factory()
            ->singleDate(self::SUNDAY_DATE)
            ->create([
                'employment_period_id' => $period->id,
                'day_of_week' => 7,
                'expected_start' => '13:00:00',
                'expected_end' => '22:00:00',
            ]);

        $response = $this->postJson('/api/v1/attendances/check-in', [
            'employee_id' => $employee->public_id,
            'check_in' => self::SUNDAY_CHECK_IN,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.date', self::SUNDAY_DATE)
            ->assertJsonPath('data.day_status', 'WORKED');
    }

    #[Test]
    public function rejects_check_in_when_active_override_marks_working_day_as_day_off(): void
    {
        // Inverse case: Monday (dow=1) is a working day in the base schedule,
        // but an override marks 2026-02-23 as is_day_off=true.
        // The check-in must be rejected with HTTP 422.
        $period = EmploymentPeriod::factory()->create([
            'is_active' => true,
            'start_date' => '2026-01-01',
        ]);
        $employee = $period->employee;

        $schedule = EmployeeSchedule::factory()->current()->create([
            'employment_period_id' => $period->id,
            'effective_from' => '2026-01-01',
        ]);

        // Base schedule: Monday is a working day
        ScheduleDay::factory()->monday()->workDay()->create([
            'employee_schedule_id' => $schedule->id,
        ]);

        // Override: Monday 2026-02-23 is treated as a rest day
        ScheduleDayOverride::factory()
            ->singleDate(self::DATE)
            ->dayOff()
            ->create([
                'employment_period_id' => $period->id,
                'day_of_week' => 1,
            ]);

        $response = $this->postJson('/api/v1/attendances/check-in', [
            'employee_id' => $employee->public_id,
            'check_in' => self::CHECK_IN,
        ]);

        $response->assertStatus(422);
        $this->assertArrayHasKey('check_in', $response->json('errors'));
    }

    // #endregion

    // #region Cross-midnight UTC (RFC 3339 with offset)

    #[Test]
    public function handles_check_in_with_negative_offset_across_utc_midnight(): void
    {
        // Monday Feb 23 at 23:00 CST (UTC-6) = Tuesday Feb 24 at 05:00 UTC.
        // The attendance date must be the LOCAL date (Feb 23), not UTC (Feb 24).
        // Schedule: expected_start = 23:00 local (CST), i.e. the night shift.
        ['employee' => $employee] = $this->makeEmployeeWithSchedule(
            date: self::DATE,                   // 2026-02-23 (Monday)
            expectedStart: '23:00:00',          // local schedule start (CST)
            expectedEnd: '06:00:00',            // local schedule end next day (CST)
        );

        $response = $this->postJson('/api/v1/attendances/check-in', [
            'employee_id' => $employee->public_id,
            'check_in' => '2026-02-23T23:00:00-06:00',  // RFC 3339 with offset
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.date', '2026-02-23')      // Local date, NOT '2026-02-24'
            ->assertJsonPath('data.entry_late_seconds', 0)    // On time
            ->assertJsonPath('data.day_status', 'WORKED');
    }

    #[Test]
    public function calculates_late_seconds_with_offset_across_utc_midnight(): void
    {
        // Monday Feb 23 at 23:10 CST = Tuesday Feb 24 at 05:10 UTC.
        // Schedule expected_start = 23:00 local (CST) → employee is 10 minutes (600 s) late.
        ['employee' => $employee] = $this->makeEmployeeWithSchedule(
            date: self::DATE,
            expectedStart: '23:00:00',
            expectedEnd: '06:00:00',
        );

        $response = $this->postJson('/api/v1/attendances/check-in', [
            'employee_id' => $employee->public_id,
            'check_in' => '2026-02-23T23:10:00-06:00',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.date', '2026-02-23')
            ->assertJsonPath('data.entry_late_seconds', 600)
            ->assertJsonPath('data.entry_late_minutes', 10);
    }

    #[Test]
    public function handles_check_in_with_positive_offset_across_utc_midnight(): void
    {
        // Tuesday Feb 24 at 01:00 JST (UTC+9) = Monday Feb 23 at 16:00 UTC.
        // The local date is Feb 24 (Tuesday), but UTC date is Feb 23 (Monday).
        // attendance.date must be the LOCAL date = Feb 24 (Tuesday).
        $date = '2026-02-24'; // Tuesday
        ['employee' => $employee] = $this->makeEmployeeWithSchedule(
            date: $date,
            expectedStart: '01:00:00',          // local schedule start (JST)
            expectedEnd: '09:00:00',            // local schedule end (JST)
        );

        $response = $this->postJson('/api/v1/attendances/check-in', [
            'employee_id' => $employee->public_id,
            'check_in' => '2026-02-24T01:00:00+09:00',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.date', '2026-02-24')      // Local date (Tuesday)
            ->assertJsonPath('data.entry_late_seconds', 0);
    }

    // #endregion

    // #region Auth

    #[Test]
    public function rejects_unauthenticated_request(): void
    {
        auth()->forgetGuards();

        $response = $this->postJson('/api/v1/attendances/check-in', [
            'employee_id' => 'any-id',
            'check_in' => self::CHECK_IN,
        ]);

        $response->assertStatus(401);
    }

    // #endregion

    // #region Helpers

    /**
     * Create an employee with an active employment period, a current schedule,
     * and a working day entry for the given date's ISO day of week.
     *
     * Returns an array with 'employee', 'period', 'schedule', 'scheduleDay'.
     *
     * @param  string  $date  The attendance date (Y-m-d) — used to derive day-of-week
     * @param  string  $expectedStart  Expected clock-in time (H:i:s)
     * @param  string  $expectedEnd  Expected clock-out time (H:i:s)
     */
    private function makeEmployeeWithSchedule(
        string $date,
        string $expectedStart,
        string $expectedEnd = '17:00:00',
    ): array {
        $dayOfWeekIso = Carbon::parse($date)->dayOfWeekIso; // 1=Mon … 7=Sun

        $period = EmploymentPeriod::factory()->create([
            'is_active' => true,
            'start_date' => '2026-01-01',
        ]);

        $employee = $period->employee;

        $schedule = EmployeeSchedule::factory()->current()->create([
            'employment_period_id' => $period->id,
            'effective_from' => '2026-01-01',
        ]);

        $scheduleDay = ScheduleDay::factory()
            ->workDay()
            ->onDayOfWeek($dayOfWeekIso)
            ->withTimes(start: $expectedStart, end: $expectedEnd)
            ->create(['employee_schedule_id' => $schedule->id]);

        return compact('employee', 'period', 'schedule', 'scheduleDay');
    }
    // #endregion

}
