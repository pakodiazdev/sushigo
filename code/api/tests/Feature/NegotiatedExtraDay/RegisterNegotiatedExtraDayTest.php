<?php

namespace Tests\Feature\NegotiatedExtraDay;

use App\Models\Employee;
use App\Models\EmployeeSchedule;
use App\Models\EmploymentPeriod;
use App\Models\NegotiatedExtraDay;
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

class RegisterNegotiatedExtraDayTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    /** Monday 2026-02-23 (ISO dow = 1) */
    private const DATE = '2026-02-23';

    protected function setUp(): void
    {
        parent::setUp();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // Roles required by Employee factory
        Role::firstOrCreate(['name' => 'employee', 'guard_name' => 'api']);
        Role::firstOrCreate(['name' => 'employee-manager', 'guard_name' => 'api']);
        foreach (Employee::POSITION_ROLES as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);
        }

        // Auth roles/permissions for the managing user
        Permission::firstOrCreate(['name' => 'attendances.create', 'guard_name' => 'api']);
        $role = Role::firstOrCreate(['name' => 'manager', 'guard_name' => 'api']);
        $role->givePermissionTo('attendances.create');

        $this->user = User::factory()->create();
        $this->user->assignRole('manager');

        Passport::actingAs($this->user);
    }

    #[Test]
    public function registers_negotiated_extra_day_and_marks_attendance_as_extra(): void
    {
        ['employee' => $employee] = $this->makeEmployeeWithDayOff(self::DATE);

        $response = $this->postJson('/api/v1/negotiated-extra-days', [
            'employee_id' => $employee->public_id,
            'date' => self::DATE,
            'agreed_daily_wage' => 500.00,
            'prima_percent' => 100.00,
        ]);

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

        $response = $this->postJson('/api/v1/negotiated-extra-days', [
            'employee_id' => $employee->public_id,
            'date' => self::DATE,
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

        $this->postJson('/api/v1/negotiated-extra-days', [
            'employee_id' => $employee->public_id,
            'date' => self::DATE,
            'agreed_daily_wage' => 500.00,
            'prima_percent' => 100.00,
        ])->assertStatus(201);

        $response = $this->postJson('/api/v1/negotiated-extra-days', [
            'employee_id' => $employee->public_id,
            'date' => self::DATE,
            'agreed_daily_wage' => 600.00,
            'prima_percent' => 100.00,
        ]);

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

        $response = $this->postJson('/api/v1/negotiated-extra-days', [
            'employee_id' => $employee->public_id,
            'date' => self::DATE,
            'agreed_daily_wage' => 500.00,
            'prima_percent' => 201.00,
        ]);

        $response->assertStatus(422);
        $this->assertArrayHasKey('prima_percent', $response->json('errors'));
    }

    #[Test]
    public function rejects_unauthenticated_request(): void
    {
        auth()->forgetGuards();

        $response = $this->postJson('/api/v1/negotiated-extra-days', [
            'employee_id' => 'some-id',
            'date' => self::DATE,
            'agreed_daily_wage' => 500.00,
            'prima_percent' => 100.00,
        ]);

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
        $dayOfWeekIso = Carbon::parse(self::DATE)->dayOfWeekIso;

        $period = EmploymentPeriod::factory()->create([
            'is_active' => true,
            'start_date' => '2026-01-01',
        ]);

        $employee = $period->employee;

        $schedule = EmployeeSchedule::factory()->current()->create([
            'employment_period_id' => $period->id,
            'effective_from' => '2026-01-01',
        ]);

        // Configured as a WORK day (not a rest day)
        ScheduleDay::factory()
            ->workDay()
            ->onDayOfWeek($dayOfWeekIso)
            ->create(['employee_schedule_id' => $schedule->id]);

        $response = $this->postJson('/api/v1/negotiated-extra-days', [
            'employee_id' => $employee->public_id,
            'date' => self::DATE,
            'agreed_daily_wage' => 500.00,
            'prima_percent' => 100.00,
        ]);

        $response->assertStatus(422);
        $this->assertArrayHasKey('date', $response->json('errors'));
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    /**
     * Create an employee with a rest day on the given date's ISO day of week.
     * Returns ['employee', 'period', 'schedule', 'scheduleDay'].
     */
    private function makeEmployeeWithDayOff(string $date): array
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
            ->dayOff()
            ->onDayOfWeek($dayOfWeekIso)
            ->create(['employee_schedule_id' => $schedule->id]);

        return compact('employee', 'period', 'schedule', 'scheduleDay');
    }
}
