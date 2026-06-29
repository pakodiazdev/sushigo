<?php

namespace Tests\Feature\NegotiatedExtraDay;

use App\Models\EmployeeSchedule;
use App\Models\EmploymentPeriod;
use App\Models\NegotiatedExtraDay;
use App\Models\ScheduleDay;
use App\Models\User;
use Carbon\Carbon;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Role;

class RegisterNegotiatedExtraDayTest extends NegotiatedExtraDayTestCase
{
    protected User $user;

    /** Monday 2026-02-23 (ISO dow = 1) */
    private const DATE = '2026-02-23';

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow(Carbon::parse(self::DATE.' 23:59:00'));

        $this->user = $this->makeManagerWithPermissions(['attendances.create']);

        // Also assign admin role so this user can register check-ins for historical dates.
        // Business-logic tests should use admin to bypass date restrictions;
        // permission tests are covered by AttendanceEditPermissionsTest.
        Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'api']);
        $this->user->assignRole('admin');
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow(null);
        parent::tearDown();
    }

    #[Test]
    public function registers_negotiated_extra_day_and_marks_attendance_as_extra(): void
    {
        ['employee' => $employee] = $this->makeEmployeeWithDayOff(self::DATE);

        $response = $this->postExtraDay($employee->public_id);

        $response->assertStatus(201)
            ->assertJsonPath('data.employee_id', $employee->public_id)
            ->assertJsonPath('data.date', self::DATE)
            ->assertJsonPath('data.agreed_daily_wage', 500)
            ->assertJsonPath('data.prima_percent', 100)
            ->assertJsonPath('data.prima_amount', 500)
            ->assertJsonPath('data.status', 'APPROVED');

        $this->assertDatabaseHas('negotiated_extra_days', [
            'date' => self::DATE,
            'agreed_daily_wage' => 500.0,
            'prima_percent' => 100.0,
            'prima_amount' => 500.0,
            'status' => 'APPROVED',
        ]);

        $this->assertDatabaseHas('attendances', [
            'date' => self::DATE,
            'day_status' => 'EXTRA',
        ]);
    }

    #[Test]
    public function calculates_prima_amount_correctly(): void
    {
        ['employee' => $employee] = $this->makeEmployeeWithDayOff(self::DATE);

        $response = $this->postExtraDay($employee->public_id, [
            'agreed_daily_wage' => 600.00,
            'prima_percent' => 50.00,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.prima_amount', 300);
    }

    #[Test]
    public function rejects_duplicate_extra_day_with_422(): void
    {
        ['employee' => $employee] = $this->makeEmployeeWithDayOff(self::DATE);

        $this->postExtraDay($employee->public_id)->assertStatus(201);

        $response = $this->postExtraDay($employee->public_id, ['agreed_daily_wage' => 600.00]);

        $response->assertStatus(422);
        $this->assertArrayHasKey('date', $response->json('errors'));
    }

    #[Test]
    public function rejects_missing_required_fields_with_422(): void
    {
        $response = $this->postJson('/api/v1/negotiated-extra-days', []);

        $response->assertStatus(422);
        $errors = $response->json('errors');
        $this->assertArrayHasKey('employee_id', $errors);
        $this->assertArrayHasKey('date', $errors);
        $this->assertArrayHasKey('agreed_daily_wage', $errors);
        $this->assertArrayHasKey('prima_percent', $errors);
    }

    #[Test]
    public function rejects_prima_percent_over_200_with_422(): void
    {
        ['employee' => $employee] = $this->makeEmployeeWithDayOff(self::DATE);

        $response = $this->postExtraDay($employee->public_id, ['prima_percent' => 201.00]);

        $response->assertStatus(422);
        $this->assertArrayHasKey('prima_percent', $response->json('errors'));
    }

    #[Test]
    public function rejects_unauthenticated_request(): void
    {
        auth()->forgetGuards();

        $response = $this->postExtraDay('some-id');

        $response->assertStatus(401);
    }

    #[Test]
    public function check_in_on_day_off_with_approved_extra_day_succeeds_with_extra_status(): void
    {
        ['employee' => $employee] = $this->makeEmployeeWithDayOff(self::DATE);

        // First create the negotiated extra day
        NegotiatedExtraDay::create([
            'employee_id' => $employee->id,
            'branch_id' => $employee->employmentPeriods()->first()->branch_id,
            'date' => self::DATE,
            'agreed_daily_wage' => 500.00,
            'prima_percent' => 100.00,
            'prima_amount' => 500.00,
            'approved_by' => $this->user->id,
            'status' => NegotiatedExtraDay::STATUS_APPROVED,
        ]);

        // Also need the attendances.create permission for check-in
        $response = $this->postJson('/api/v1/attendances/check-in', [
            'employee_id' => $employee->public_id,
            'check_in' => self::DATE.'T09:00:00',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.day_status', 'EXTRA');
    }

    #[Test]
    public function rejects_date_that_is_not_a_rest_day_with_422(): void
    {
        ['employee' => $employee] = $this->makeEmployeeWithWorkDay(self::DATE);

        $response = $this->postExtraDay($employee->public_id);

        $response->assertStatus(422);
        $this->assertArrayHasKey('date', $response->json('errors'));
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    /**
     * POST to /api/v1/negotiated-extra-days with sensible defaults.
     *
     * @param  array<string, mixed>  $overrides
     */
    private function postExtraDay(string $employeePublicId, array $overrides = []): \Illuminate\Testing\TestResponse
    {
        return $this->postJson('/api/v1/negotiated-extra-days', array_merge([
            'employee_id' => $employeePublicId,
            'date' => self::DATE,
            'agreed_daily_wage' => 500.00,
            'prima_percent' => 100.00,
        ], $overrides));
    }

    /**
     * Create an employee with a rest day on the given date's ISO day of week.
     * Returns ['employee', 'period', 'schedule', 'scheduleDay'].
     */
    private function makeEmployeeWithDayOff(string $date): array
    {
        return $this->makeEmployeeWithScheduleDay($date, isDayOff: true);
    }

    /**
     * Create an employee with a work day (not rest day) on the given date's ISO day of week.
     * Returns ['employee', 'period', 'schedule', 'scheduleDay'].
     */
    private function makeEmployeeWithWorkDay(string $date): array
    {
        return $this->makeEmployeeWithScheduleDay($date, isDayOff: false);
    }

    /**
     * @return array{employee: \App\Models\Employee, period: \App\Models\EmploymentPeriod, schedule: \App\Models\EmployeeSchedule, scheduleDay: \App\Models\ScheduleDay}
     */
    private function makeEmployeeWithScheduleDay(string $date, bool $isDayOff): array
    {
        $dayOfWeekIso = Carbon::parse($date)->dayOfWeekIso;

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
            ->when($isDayOff, fn ($f) => $f->dayOff(), fn ($f) => $f->workDay())
            ->onDayOfWeek($dayOfWeekIso)
            ->create(['employee_schedule_id' => $schedule->id]);

        return compact('employee', 'period', 'schedule', 'scheduleDay');
    }
}
