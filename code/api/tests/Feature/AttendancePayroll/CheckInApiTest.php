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
use Tests\TestCase;

class CheckInApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    /** Monday 2026-02-23 at 09:00:00 (ISO dow = 1) */
    private const DATE      = '2026-02-23';
    private const CHECK_IN  = '2026-02-23T09:00:00';
    private const START     = '09:00:00';

    protected function setUp(): void
    {
        parent::setUp();

        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

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

    // ── Happy path ────────────────────────────────────────────────────────────

    #[Test]
    public function registers_on_time_check_in(): void
    {
        ['employee' => $employee] = $this->makeEmployeeWithSchedule(
            date: self::DATE,
            expectedStart: self::START,
        );

        $response = $this->postJson('/api/v1/attendances/check-in', [
            'employee_id' => $employee->public_id,
            'check_in'    => self::CHECK_IN,  // exactly on time
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
            'check_in'    => '2026-02-23T09:15:00',
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
            'check_in'    => '2026-02-23T09:35:00',
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
            'check_in'    => '2026-02-23T08:50:00',
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
            'check_in'    => self::CHECK_IN,
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

        // ID exposed as ULID (26 chars)
        $this->assertEquals(26, strlen($response->json('data.id')));
        // date formatted as Y-m-d
        $this->assertEquals(self::DATE, $response->json('data.date'));
    }

    // ── 422 error cases ───────────────────────────────────────────────────────

    #[Test]
    public function rejects_duplicate_attendance(): void
    {
        ['employee' => $employee] = $this->makeEmployeeWithSchedule(
            date: self::DATE,
            expectedStart: self::START,
        );

        // First check-in succeeds
        $this->postJson('/api/v1/attendances/check-in', [
            'employee_id' => $employee->public_id,
            'check_in'    => self::CHECK_IN,
        ])->assertStatus(201);

        // Second check-in for same date → 422
        $response = $this->postJson('/api/v1/attendances/check-in', [
            'employee_id' => $employee->public_id,
            'check_in'    => self::CHECK_IN,
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
            'check_in'    => self::CHECK_IN,
        ]);

        $response->assertStatus(422);
        $this->assertArrayHasKey('employee_id', $response->json('errors'));
    }

    #[Test]
    public function rejects_when_no_active_schedule(): void
    {
        // Employment period exists but no schedule assigned
        $period   = EmploymentPeriod::factory()->create([
            'is_active'  => true,
            'start_date' => '2026-01-01',
        ]);
        $employee = $period->employee;

        $response = $this->postJson('/api/v1/attendances/check-in', [
            'employee_id' => $employee->public_id,
            'check_in'    => self::CHECK_IN,
        ]);

        $response->assertStatus(422);
        $this->assertArrayHasKey('employee_id', $response->json('errors'));
    }

    #[Test]
    public function rejects_when_no_schedule_day_configured_for_day_of_week(): void
    {
        $period   = EmploymentPeriod::factory()->create([
            'is_active'  => true,
            'start_date' => '2026-01-01',
        ]);
        $employee = $period->employee;

        // Schedule exists but only has Saturday (6) — no Monday (1) entry
        $schedule = EmployeeSchedule::factory()->current()->create([
            'employment_period_id' => $period->id,
            'effective_from'       => '2026-01-01',
        ]);
        ScheduleDay::factory()->saturday()->workDay()->create([
            'employee_schedule_id' => $schedule->id,
        ]);

        // Check-in is on Monday 2026-02-23 (dow=1) — not configured
        $response = $this->postJson('/api/v1/attendances/check-in', [
            'employee_id' => $employee->public_id,
            'check_in'    => self::CHECK_IN,
        ]);

        $response->assertStatus(422);
        $this->assertArrayHasKey('check_in', $response->json('errors'));
    }

    #[Test]
    public function rejects_when_schedule_day_is_day_off(): void
    {
        $period   = EmploymentPeriod::factory()->create([
            'is_active'  => true,
            'start_date' => '2026-01-01',
        ]);
        $employee = $period->employee;

        $schedule = EmployeeSchedule::factory()->current()->create([
            'employment_period_id' => $period->id,
            'effective_from'       => '2026-01-01',
        ]);

        // Monday (1) is configured as day off
        ScheduleDay::factory()->monday()->dayOff()->create([
            'employee_schedule_id' => $schedule->id,
        ]);

        $response = $this->postJson('/api/v1/attendances/check-in', [
            'employee_id' => $employee->public_id,
            'check_in'    => self::CHECK_IN,
        ]);

        $response->assertStatus(422);
        $this->assertArrayHasKey('check_in', $response->json('errors'));
    }

    // ── Auth ──────────────────────────────────────────────────────────────────

    #[Test]
    public function rejects_unauthenticated_request(): void
    {
        // Log out the Passport user and hit the route without credentials
        auth()->forgetGuards();

        $response = $this->postJson('/api/v1/attendances/check-in', [
            'employee_id' => 'any-id',
            'check_in'    => self::CHECK_IN,
        ]);

        $response->assertStatus(401);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Create an employee with an active employment period, a current schedule,
     * and a working day entry for the given date's ISO day of week.
     *
     * Returns an array with 'employee', 'period', 'schedule', 'scheduleDay'.
     *
     * @param  string  $date          The attendance date (Y-m-d)
     * @param  string  $expectedStart Expected clock-in time (H:i:s)
     */
    private function makeEmployeeWithSchedule(string $date, string $expectedStart): array
    {
        $checkInCarbon = \Carbon\Carbon::parse($date . 'T' . $expectedStart);
        $dayOfWeekIso  = $checkInCarbon->dayOfWeekIso; // 1=Mon … 7=Sun

        $period = EmploymentPeriod::factory()->create([
            'is_active'  => true,
            'start_date' => '2026-01-01',
        ]);

        $employee = $period->employee;

        $schedule = EmployeeSchedule::factory()->current()->create([
            'employment_period_id' => $period->id,
            'effective_from'       => '2026-01-01',
        ]);

        $scheduleDay = ScheduleDay::factory()
            ->workDay()
            ->onDayOfWeek($dayOfWeekIso)
            ->withTimes(start: $expectedStart, end: '17:00:00')
            ->create(['employee_schedule_id' => $schedule->id]);

        return compact('employee', 'period', 'schedule', 'scheduleDay');
    }
}
