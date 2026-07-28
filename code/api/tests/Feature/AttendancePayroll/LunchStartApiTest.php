<?php

namespace Tests\Feature\AttendancePayroll;

use App\Models\Attendance;
use App\Models\Employee;
use App\Models\EmployeeSchedule;
use App\Models\EmploymentPeriod;
use App\Models\PayPeriod;
use App\Models\ScheduleDay;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class LunchStartApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    /** Monday 2026-02-23 — same date used across all tests */
    private const DATE = '2026-02-23';

    private const CHECK_IN = '2026-02-23T09:00:00';

    private const LUNCH_START = '2026-02-23T13:05:00';

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow(Carbon::parse(self::DATE.' 23:59:00'));

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        Permission::create(['name' => 'attendances.create', 'guard_name' => 'api']);
        Permission::create(['name' => 'attendances.update', 'guard_name' => 'api']);
        $role = Role::create(['name' => 'admin', 'guard_name' => 'api']);
        $role->givePermissionTo(['attendances.create', 'attendances.update']);

        // Position roles required by Employee factory
        Role::firstOrCreate(['name' => 'employee',         'guard_name' => 'api']);
        Role::firstOrCreate(['name' => 'employee-manager', 'guard_name' => 'api']);
        Role::firstOrCreate(['name' => 'manager',          'guard_name' => 'api']);
        foreach (Employee::POSITION_ROLES as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);
        }

        $this->user = User::factory()->create();
        $this->user->assignRole('admin');

        Passport::actingAs($this->user);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow(null);
        parent::tearDown();
    }

    // #region Happy path

    #[Test]
    public function registers_lunch_start_successfully(): void
    {
        $attendance = $this->makeAttendanceWithCheckIn();

        $response = $this->patchJson(
            "/api/v1/attendances/{$attendance->public_id}/lunch-start",
            ['lunch_start' => self::LUNCH_START],
        );

        $response->assertStatus(200)
            ->assertJsonPath('data.lunch_start', self::LUNCH_START.'+00:00');
    }

    #[Test]
    public function lunch_start_is_stored_in_database(): void
    {
        $attendance = $this->makeAttendanceWithCheckIn();

        $this->patchJson(
            "/api/v1/attendances/{$attendance->public_id}/lunch-start",
            ['lunch_start' => self::LUNCH_START],
        )->assertStatus(200);

        $this->assertDatabaseHas('attendances', [
            'id' => $attendance->id,
            'lunch_start' => '2026-02-23 13:05:00',
        ]);
    }

    #[Test]
    public function returns_correct_response_structure(): void
    {
        $attendance = $this->makeAttendanceWithCheckIn();

        $response = $this->patchJson(
            "/api/v1/attendances/{$attendance->public_id}/lunch-start",
            ['lunch_start' => self::LUNCH_START],
        );

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'data' => [
                    'id',
                    'employee_id',
                    'date',
                    'check_in',
                    'lunch_start',
                    'entry_late_seconds',
                    'lunch_late_seconds',
                    'day_status',
                    'created_at',
                ],
            ]);

        $this->assertEquals(26, strlen($response->json('data.id')));
    }

    // #endregion

    // #region 422 error cases

    #[Test]
    public function rejects_when_no_check_in_registered(): void
    {
        // Attendance exists but has no check_in (e.g. day_off or absence row)
        $employee = Employee::factory()->create();
        $attendance = Attendance::factory()->onDate(self::DATE)->create([
            'employee_id' => $employee->id,
            'check_in' => null,
        ]);

        $response = $this->patchJson(
            "/api/v1/attendances/{$attendance->public_id}/lunch-start",
            ['lunch_start' => self::LUNCH_START],
        );

        $response->assertStatus(422);
        $this->assertArrayHasKey('lunch_start', $response->json('errors'));
    }

    #[Test]
    public function allows_correcting_an_already_recorded_lunch_start(): void
    {
        $attendance = $this->makeAttendanceWithCheckIn();

        $this->patchJson(
            "/api/v1/attendances/{$attendance->public_id}/lunch-start",
            ['lunch_start' => self::LUNCH_START],
        )->assertStatus(200);

        // Correct the mistaken time — the admin has attendances.update
        $response = $this->patchJson(
            "/api/v1/attendances/{$attendance->public_id}/lunch-start",
            ['lunch_start' => '2026-02-23T13:15:00'],
        );

        $response->assertStatus(200)
            ->assertJsonPath('data.lunch_start', '2026-02-23T13:15:00+00:00');
    }

    #[Test]
    public function correcting_lunch_start_recalculates_lunch_late_seconds_when_lunch_end_already_recorded(): void
    {
        // Schedule: 60-min lunch duration. Original lunch_start=13:05 + lunch_end=14:35
        // recorded 30 min late (expected return 14:05). Correcting the mistyped
        // lunch_start to 13:35 moves the expected return to 14:35 — exactly the
        // already-recorded lunch_end — so lunch_late_seconds must drop to 0,
        // not silently keep reflecting the stale 30-minute lateness.
        [$attendance] = $this->makeAttendanceWithLunchEnd();

        $response = $this->patchJson(
            "/api/v1/attendances/{$attendance->public_id}/lunch-start",
            ['lunch_start' => '2026-02-23T13:35:00'],
        );

        $response->assertStatus(200)
            ->assertJsonPath('data.lunch_late_seconds', 0);

        $attendance->refresh();
        $this->assertSame(0, $attendance->lunch_late_seconds);
    }

    #[Test]
    public function rejects_lunch_start_correction_without_attendances_update_permission(): void
    {
        $attendance = $this->makeAttendanceWithCheckIn();

        $this->patchJson(
            "/api/v1/attendances/{$attendance->public_id}/lunch-start",
            ['lunch_start' => self::LUNCH_START],
        )->assertStatus(200);

        $limitedRole = Role::create(['name' => 'manager-no-correction', 'guard_name' => 'api']);
        $limitedRole->givePermissionTo('attendances.create');
        $limitedUser = User::factory()->create();
        $limitedUser->assignRole('manager-no-correction');
        Passport::actingAs($limitedUser);

        $response = $this->patchJson(
            "/api/v1/attendances/{$attendance->public_id}/lunch-start",
            ['lunch_start' => '2026-02-23T13:15:00'],
        );

        $response->assertStatus(403);
    }

    #[Test]
    public function rejects_invalid_attendance_id(): void
    {
        $response = $this->patchJson(
            '/api/v1/attendances/nonexistent-ulid-abc/lunch-start',
            ['lunch_start' => self::LUNCH_START],
        );

        $response->assertStatus(404);
    }

    #[Test]
    public function rejects_invalid_datetime_format(): void
    {
        $attendance = $this->makeAttendanceWithCheckIn();

        $response = $this->patchJson(
            "/api/v1/attendances/{$attendance->public_id}/lunch-start",
            ['lunch_start' => '23/02/2026 13:05'],  // wrong format
        );

        $response->assertStatus(422);
        $this->assertArrayHasKey('lunch_start', $response->json('errors'));
    }

    #[Test]
    public function rejects_lunch_start_when_date_is_covered_by_a_closed_pay_period(): void
    {
        $period = EmploymentPeriod::factory()->create(['is_active' => true, 'start_date' => '2026-01-01']);
        $attendance = Attendance::factory()->onDate(self::DATE)->create([
            'employee_id' => $period->employee_id,
            'check_in' => self::CHECK_IN,
            'lunch_start' => null,
        ]);

        PayPeriod::create([
            'branch_id' => $period->branch_id,
            'period_start' => '2026-02-22',
            'period_end' => '2026-02-28',
            'status' => PayPeriod::STATUS_CLOSED,
        ]);

        $response = $this->patchJson(
            "/api/v1/attendances/{$attendance->public_id}/lunch-start",
            ['lunch_start' => self::LUNCH_START],
        );

        $response->assertStatus(422);
        $this->assertArrayHasKey('date', $response->json('errors'));
    }

    // #endregion

    // #region Auth

    #[Test]
    public function rejects_unauthenticated_request(): void
    {
        $attendance = $this->makeAttendanceWithCheckIn();

        auth()->forgetGuards();

        $response = $this->patchJson(
            "/api/v1/attendances/{$attendance->public_id}/lunch-start",
            ['lunch_start' => self::LUNCH_START],
        );

        $response->assertStatus(401);
    }

    // #endregion

    // #region Helpers

    /**
     * Create an attendance record that already has a check_in but no lunch_start.
     */
    private function makeAttendanceWithCheckIn(): Attendance
    {
        $employee = Employee::factory()->create();

        return Attendance::factory()->onDate(self::DATE)->create([
            'employee_id' => $employee->id,
            'check_in' => self::CHECK_IN,
            'lunch_start' => null,
        ]);
    }

    /**
     * Full scenario with a 60-min lunch schedule and an already-recorded
     * lunch_start (13:05) + lunch_end (14:35, 30 min late against the
     * original expected return of 14:05).
     *
     * @return array{0: Attendance}
     */
    private function makeAttendanceWithLunchEnd(): array
    {
        $dayOfWeekIso = Carbon::parse(self::DATE)->dayOfWeekIso; // 1 = Monday

        $period = EmploymentPeriod::factory()->create([
            'is_active' => true,
            'start_date' => '2026-01-01',
        ]);

        $employee = $period->employee;

        $schedule = EmployeeSchedule::factory()->current()->create([
            'employment_period_id' => $period->id,
            'effective_from' => '2026-01-01',
        ]);

        ScheduleDay::factory()
            ->workDay()
            ->onDayOfWeek($dayOfWeekIso)
            ->withTimes(start: '09:00:00', end: '17:00:00')
            ->withLunchDuration(60)
            ->create(['employee_schedule_id' => $schedule->id]);

        $attendance = Attendance::factory()->onDate(self::DATE)->create([
            'employee_id' => $employee->id,
            'check_in' => self::CHECK_IN,
            'lunch_start' => self::LUNCH_START,
            'lunch_end' => '2026-02-23T14:35:00',
            'lunch_late_seconds' => 1800,
        ]);

        return [$attendance];
    }
    // #endregion

}
