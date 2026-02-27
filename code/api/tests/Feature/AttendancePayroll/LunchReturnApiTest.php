<?php

namespace Tests\Feature\AttendancePayroll;

use App\Models\Attendance;
use App\Models\Employee;
use App\Models\EmployeeSchedule;
use App\Models\EmploymentPeriod;
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

class LunchReturnApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    /**
     * Monday 2026-02-23 — base date for all tests.
     * Lunch-start at 13:05, schedule has 60 min lunch → expected return = 14:05.
     */
    private const DATE          = '2026-02-23';
    private const LUNCH_START   = '2026-02-23T13:05:00';
    private const ON_TIME_RETURN = '2026-02-23T14:05:00';  // exactly on time
    private const LUNCH_DURATION = 60;                      // minutes

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

    // ── Happy path ────────────────────────────────────────────────────────────

    #[Test]
    public function registers_on_time_return(): void
    {
        ['attendance' => $attendance] = $this->makeAttendanceWithLunchStart();

        $response = $this->patchJson(
            "/api/v1/attendances/{$attendance->public_id}/lunch-return",
            ['lunch_end' => self::ON_TIME_RETURN],
        );

        $response->assertStatus(200)
            ->assertJsonPath('data.lunch_late_seconds', 0)
            ->assertJsonPath('data.lunch_late_minutes', 0)
            ->assertJsonPath('data.is_lunch_deductible', false);
    }

    #[Test]
    public function registers_late_return_under_30_min(): void
    {
        ['attendance' => $attendance] = $this->makeAttendanceWithLunchStart();

        // 20 min late (1200 seconds) — under 30-min deductible threshold
        $response = $this->patchJson(
            "/api/v1/attendances/{$attendance->public_id}/lunch-return",
            ['lunch_end' => '2026-02-23T14:25:00'],
        );

        $response->assertStatus(200)
            ->assertJsonPath('data.lunch_late_seconds', 1200)
            ->assertJsonPath('data.lunch_late_minutes', 20)
            ->assertJsonPath('data.is_lunch_deductible', false);
    }

    #[Test]
    public function registers_late_return_over_30_min(): void
    {
        ['attendance' => $attendance] = $this->makeAttendanceWithLunchStart();

        // 35 min late (2100 seconds) — exceeds deductible threshold
        $response = $this->patchJson(
            "/api/v1/attendances/{$attendance->public_id}/lunch-return",
            ['lunch_end' => '2026-02-23T14:40:00'],
        );

        $response->assertStatus(200)
            ->assertJsonPath('data.lunch_late_seconds', 2100)
            ->assertJsonPath('data.lunch_late_minutes', 35)
            ->assertJsonPath('data.is_lunch_deductible', true);
    }

    #[Test]
    public function early_return_records_zero_late_seconds(): void
    {
        ['attendance' => $attendance] = $this->makeAttendanceWithLunchStart();

        // 10 min early — should record 0 late seconds
        $response = $this->patchJson(
            "/api/v1/attendances/{$attendance->public_id}/lunch-return",
            ['lunch_end' => '2026-02-23T13:55:00'],
        );

        $response->assertStatus(200)
            ->assertJsonPath('data.lunch_late_seconds', 0)
            ->assertJsonPath('data.is_lunch_deductible', false);
    }

    #[Test]
    public function returns_correct_response_structure(): void
    {
        ['attendance' => $attendance] = $this->makeAttendanceWithLunchStart();

        $response = $this->patchJson(
            "/api/v1/attendances/{$attendance->public_id}/lunch-return",
            ['lunch_end' => self::ON_TIME_RETURN],
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
                    'lunch_end',
                    'lunch_late_seconds',
                    'lunch_late_minutes',
                    'is_lunch_deductible',
                    'day_status',
                    'created_at',
                ],
            ]);

        $this->assertEquals(26, strlen($response->json('data.id')));
    }

    // ── 422 error cases ───────────────────────────────────────────────────────

    #[Test]
    public function rejects_when_no_lunch_start_registered(): void
    {
        // Attendance has check_in but no lunch_start yet
        $employee   = Employee::factory()->create();
        $attendance = Attendance::factory()->onDate(self::DATE)->create([
            'employee_id' => $employee->id,
            'check_in'    => '2026-02-23T09:00:00',
            'lunch_start' => null,
        ]);

        $response = $this->patchJson(
            "/api/v1/attendances/{$attendance->public_id}/lunch-return",
            ['lunch_end' => self::ON_TIME_RETURN],
        );

        $response->assertStatus(422);
        $this->assertArrayHasKey('lunch_end', $response->json('errors'));
    }

    #[Test]
    public function rejects_duplicate_lunch_end(): void
    {
        ['attendance' => $attendance] = $this->makeAttendanceWithLunchStart();

        $this->patchJson(
            "/api/v1/attendances/{$attendance->public_id}/lunch-return",
            ['lunch_end' => self::ON_TIME_RETURN],
        )->assertStatus(200);

        $response = $this->patchJson(
            "/api/v1/attendances/{$attendance->public_id}/lunch-return",
            ['lunch_end' => self::ON_TIME_RETURN],
        );

        $response->assertStatus(422);
        $this->assertArrayHasKey('lunch_end', $response->json('errors'));
    }

    #[Test]
    public function rejects_invalid_attendance_id(): void
    {
        $response = $this->patchJson(
            '/api/v1/attendances/nonexistent-ulid-xyz/lunch-return',
            ['lunch_end' => self::ON_TIME_RETURN],
        );

        $response->assertStatus(404);
    }

    // ── Auth ──────────────────────────────────────────────────────────────────

    #[Test]
    public function rejects_unauthenticated_request(): void
    {
        ['attendance' => $attendance] = $this->makeAttendanceWithLunchStart();

        auth()->forgetGuards();

        $response = $this->patchJson(
            "/api/v1/attendances/{$attendance->public_id}/lunch-return",
            ['lunch_end' => self::ON_TIME_RETURN],
        );

        $response->assertStatus(401);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Create a full scenario: employee → employment period → schedule → schedule day (Monday)
     * + an Attendance already having check_in and lunch_start set.
     *
     * The ScheduleDay has lunch_duration_minutes = 60, so:
     *   lunch_start = 13:05  →  expected_return = 14:05
     *
     * Returns compact array with 'attendance', 'employee', 'period', 'schedule', 'scheduleDay'.
     */
    private function makeAttendanceWithLunchStart(): array
    {
        $lunchStart   = Carbon::parse(self::LUNCH_START);
        $dayOfWeekIso = $lunchStart->dayOfWeekIso; // 1 = Monday

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
            ->withTimes(start: '09:00:00', end: '17:00:00')
            ->withLunchDuration(self::LUNCH_DURATION)
            ->create(['employee_schedule_id' => $schedule->id]);

        $attendance = Attendance::factory()->onDate(self::DATE)->create([
            'employee_id' => $employee->id,
            'check_in'    => '2026-02-23T09:00:00',
            'lunch_start' => self::LUNCH_START,
            'lunch_end'   => null,
        ]);

        return compact('attendance', 'employee', 'period', 'schedule', 'scheduleDay');
    }
}
