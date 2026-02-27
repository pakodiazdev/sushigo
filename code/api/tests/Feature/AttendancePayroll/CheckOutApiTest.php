<?php

namespace Tests\Feature\AttendancePayroll;

use App\Models\Attendance;
use App\Models\Employee;
use App\Models\EmployeeSchedule;
use App\Models\EmploymentPeriod;
use App\Models\ScheduleDay;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class CheckOutApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    /**
     * Monday 2026-02-23.
     * Schedule: 09:00 → 17:00, 60-min lunch.
     * Lunch recorded: 13:05 → 14:05 (on time, 60 min).
     *
     * On-time checkout:  17:00 → net = (17:00-09:00) - (14:05-13:05) = 480 - 60 = 420 min, OT = 0
     * Early checkout:    16:00 → net = (16:00-09:00) - 60 = 360 min, OT = 0
     * Overtime checkout: 17:35 → net = 8h55m - 60m = 475 min, OT = 35 min
     */
    private const DATE          = '2026-02-23';
    private const CHECK_IN      = '2026-02-23T09:00:00';
    private const LUNCH_START   = '2026-02-23T13:05:00';
    private const LUNCH_END     = '2026-02-23T14:05:00';    // exactly 60 min lunch
    private const EXPECTED_END  = '17:00:00';

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

    // #region Happy path

    #[Test]
    public function registers_checkout_on_time_no_overtime(): void
    {
        ['attendance' => $attendance] = $this->makeAttendanceWithLunch();

        $response = $this->patchJson(
            "/api/v1/attendances/{$attendance->public_id}/check-out",
            ['check_out' => '2026-02-23T17:00:00'],
        );

        $response->assertStatus(200)
            ->assertJsonPath('data.overtime_minutes', 0)
            ->assertJsonPath('data.requires_overtime_decision', false)
            ->assertJsonPath('data.net_worked_minutes', 420);  // 8h - 1h lunch = 7h = 420 min
    }

    #[Test]
    public function registers_checkout_with_overtime(): void
    {
        ['attendance' => $attendance] = $this->makeAttendanceWithLunch();

        // 35 minutes overtime
        $response = $this->patchJson(
            "/api/v1/attendances/{$attendance->public_id}/check-out",
            ['check_out' => '2026-02-23T17:35:00'],
        );

        $response->assertStatus(200)
            ->assertJsonPath('data.overtime_minutes', 35)
            ->assertJsonPath('data.requires_overtime_decision', true);
    }

    #[Test]
    public function early_checkout_records_zero_overtime(): void
    {
        ['attendance' => $attendance] = $this->makeAttendanceWithLunch();

        // Leave 1 hour early — no overtime
        $response = $this->patchJson(
            "/api/v1/attendances/{$attendance->public_id}/check-out",
            ['check_out' => '2026-02-23T16:00:00'],
        );

        $response->assertStatus(200)
            ->assertJsonPath('data.overtime_minutes', 0)
            ->assertJsonPath('data.requires_overtime_decision', false);
    }

    #[Test]
    public function net_worked_minutes_deducts_lunch_break(): void
    {
        ['attendance' => $attendance] = $this->makeAttendanceWithLunch();

        // 09:00 → 17:00 = 8h gross, lunch 13:05 → 14:05 = 60 min → net = 420
        $response = $this->patchJson(
            "/api/v1/attendances/{$attendance->public_id}/check-out",
            ['check_out' => '2026-02-23T17:00:00'],
        );

        $response->assertStatus(200)
            ->assertJsonPath('data.net_worked_minutes', 420);
    }

    #[Test]
    public function net_worked_minutes_without_lunch_uses_gross_duration(): void
    {
        // Attendance with check_in only (no lunch recorded)
        ['attendance' => $attendance] = $this->makeAttendanceWithCheckIn();

        // 09:00 → 17:00 = 480 min gross (no lunch deduction)
        $response = $this->patchJson(
            "/api/v1/attendances/{$attendance->public_id}/check-out",
            ['check_out' => '2026-02-23T17:00:00'],
        );

        $response->assertStatus(200)
            ->assertJsonPath('data.net_worked_minutes', 480);
    }

    #[Test]
    public function returns_correct_response_structure(): void
    {
        ['attendance' => $attendance] = $this->makeAttendanceWithLunch();

        $response = $this->patchJson(
            "/api/v1/attendances/{$attendance->public_id}/check-out",
            ['check_out' => '2026-02-23T17:00:00'],
        );

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'data' => [
                    'id',
                    'employee_id',
                    'date',
                    'check_in',
                    'check_out',
                    'lunch_start',
                    'lunch_end',
                    'net_worked_minutes',
                    'overtime_minutes',
                    'overtime_authorized',
                    'requires_overtime_decision',
                    'day_status',
                    'created_at',
                    'updated_at',
                ],
            ]);

        $this->assertEquals(26, strlen($response->json('data.id')));
    }

    // #endregion

    // #region 422 error cases

    #[Test]
    public function rejects_when_no_check_in_registered(): void
    {
        $employee   = Employee::factory()->create();
        $attendance = Attendance::factory()->onDate(self::DATE)->create([
            'employee_id' => $employee->id,
            'check_in'    => null,
        ]);

        $response = $this->patchJson(
            "/api/v1/attendances/{$attendance->public_id}/check-out",
            ['check_out' => '2026-02-23T17:00:00'],
        );

        $response->assertStatus(422);
        $this->assertArrayHasKey('check_out', $response->json('errors'));
    }

    #[Test]
    public function rejects_duplicate_checkout(): void
    {
        ['attendance' => $attendance] = $this->makeAttendanceWithLunch();

        $this->patchJson(
            "/api/v1/attendances/{$attendance->public_id}/check-out",
            ['check_out' => '2026-02-23T17:00:00'],
        )->assertStatus(200);

        $response = $this->patchJson(
            "/api/v1/attendances/{$attendance->public_id}/check-out",
            ['check_out' => '2026-02-23T17:00:00'],
        );

        $response->assertStatus(422);
        $this->assertArrayHasKey('check_out', $response->json('errors'));
    }

    #[Test]
    public function rejects_invalid_attendance_id(): void
    {
        $response = $this->patchJson(
            '/api/v1/attendances/nonexistent-ulid-999/check-out',
            ['check_out' => '2026-02-23T17:00:00'],
        );

        $response->assertStatus(404);
    }

    // #endregion

    // #region Cross-midnight UTC (RFC 3339 with offset)

    #[Test]
    public function calculates_overtime_with_offset_across_utc_midnight(): void
    {
        // Night shift: Mon Feb 23 at 23:00 CST → Tue Feb 24 at 06:35 CST (check-out)
        // UTC equivalent: 05:00 → 12:35
        // Schedule: expected_start=05:00, expected_end=12:00 (UTC)
        // Overtime = 35 minutes
        ['attendance' => $attendance] = $this->makeNightShiftAttendance();

        $response = $this->patchJson(
            "/api/v1/attendances/{$attendance->public_id}/check-out",
            ['check_out' => '2026-02-24T06:35:00-06:00'],  // 12:35 UTC
        );

        $response->assertStatus(200)
            ->assertJsonPath('data.overtime_minutes', 35)
            ->assertJsonPath('data.requires_overtime_decision', true);
    }

    #[Test]
    public function net_worked_minutes_correct_for_cross_midnight_shift(): void
    {
        // Night shift 05:00→12:00 UTC, no lunch, checkout at 12:00 UTC
        // gross = 12:00 - 05:00 = 7h = 420 min, no lunch → net = 420
        ['attendance' => $attendance] = $this->makeNightShiftAttendance();

        $response = $this->patchJson(
            "/api/v1/attendances/{$attendance->public_id}/check-out",
            ['check_out' => '2026-02-24T06:00:00-06:00'],  // 12:00 UTC
        );

        $response->assertStatus(200)
            ->assertJsonPath('data.net_worked_minutes', 420)
            ->assertJsonPath('data.overtime_minutes', 0);
    }

    // #endregion

    // #region Auth

    #[Test]
    public function rejects_unauthenticated_request(): void
    {
        ['attendance' => $attendance] = $this->makeAttendanceWithLunch();

        auth()->forgetGuards();

        $response = $this->patchJson(
            "/api/v1/attendances/{$attendance->public_id}/check-out",
            ['check_out' => '2026-02-23T17:00:00'],
        );

        $response->assertStatus(401);
    }

    // #endregion

    // #region Helpers

    /**
     * Full scenario with schedule + attendance that has check_in, lunch_start, lunch_end.
     *
     * Schedule: Monday 09:00→17:00, lunch_duration_minutes=60, expected_end=17:00
     */
    private function makeAttendanceWithLunch(): array
    {
        ['employee' => $employee, 'schedule' => $schedule] = $this->makeEmployeeWithSchedule();

        $attendance = Attendance::factory()->onDate(self::DATE)->create([
            'employee_id' => $employee->id,
            'check_in'    => self::CHECK_IN,
            'lunch_start' => self::LUNCH_START,
            'lunch_end'   => self::LUNCH_END,
            'check_out'   => null,
        ]);

        return compact('attendance', 'employee', 'schedule');
    }

    /**
     * Scenario without lunch — only check_in (for testing gross worked minutes).
     */
    private function makeAttendanceWithCheckIn(): array
    {
        ['employee' => $employee, 'schedule' => $schedule] = $this->makeEmployeeWithSchedule();

        $attendance = Attendance::factory()->onDate(self::DATE)->create([
            'employee_id' => $employee->id,
            'check_in'    => self::CHECK_IN,
            'lunch_start' => null,
            'lunch_end'   => null,
            'check_out'   => null,
        ]);

        return compact('attendance', 'employee', 'schedule');
    }

    /**
     * Create an employee with active period + schedule configured for Monday.
     */
    private function makeEmployeeWithSchedule(): array
    {
        $period = EmploymentPeriod::factory()->create([
            'is_active'  => true,
            'start_date' => '2026-01-01',
        ]);

        $employee = $period->employee;

        $schedule = EmployeeSchedule::factory()->current()->create([
            'employment_period_id' => $period->id,
            'effective_from'       => '2026-01-01',
        ]);

        ScheduleDay::factory()
            ->workDay()
            ->monday()
            ->withTimes(start: '09:00:00', end: self::EXPECTED_END)
            ->withLunchDuration(60)
            ->create(['employee_schedule_id' => $schedule->id]);

        return compact('employee', 'period', 'schedule');
    }

    /**
     * Night shift scenario: check-in crosses UTC midnight.
     *
     * Local: Mon Feb 23 at 23:00 CST (UTC-6) = Tue Feb 24 at 05:00 UTC.
     * Schedule: expected_start=05:00 UTC, expected_end=12:00 UTC, no lunch.
     * Attendance: date='2026-02-23' (local Monday), check_in='2026-02-24T05:00:00' (UTC).
     */
    private function makeNightShiftAttendance(): array
    {
        $period = EmploymentPeriod::factory()->create([
            'is_active'  => true,
            'start_date' => '2026-01-01',
        ]);

        $employee = $period->employee;

        $schedule = EmployeeSchedule::factory()->current()->create([
            'employment_period_id' => $period->id,
            'effective_from'       => '2026-01-01',
        ]);

        // Monday (dow=1) — night shift 05:00→12:00 UTC, no lunch
        ScheduleDay::factory()
            ->workDay()
            ->monday()
            ->withTimes(start: '05:00:00', end: '12:00:00')
            ->withLunchDuration(null)
            ->create(['employee_schedule_id' => $schedule->id]);

        // Attendance with LOCAL date (2026-02-23 Monday) but UTC check-in (next day)
        $attendance = Attendance::factory()->onDate('2026-02-23')->create([
            'employee_id' => $employee->id,
            'check_in'    => '2026-02-24T05:00:00',   // UTC
            'lunch_start' => null,
            'lunch_end'   => null,
            'check_out'   => null,
        ]);

        return compact('attendance', 'employee', 'schedule');
    }
    // #endregion

}
