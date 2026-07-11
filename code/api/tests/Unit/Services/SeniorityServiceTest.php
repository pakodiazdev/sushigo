<?php

namespace Tests\Unit\Services;

use App\Enums\ClockMode;
use App\Enums\TerminationType;
use App\Models\ApplicationClockState;
use App\Models\Branch;
use App\Models\Employee;
use App\Models\EmploymentPeriod;
use App\Services\SeniorityService;
use App\Services\VacationRules\VacationsLFTMX;
use App\Support\Clock\ApplicationClock;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class SeniorityServiceTest extends TestCase
{
    use RefreshDatabase;

    private SeniorityService $service;

    private Branch $branch;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (Employee::POSITION_ROLES as $role) {
            Role::firstOrCreate(['name' => $role, 'guard_name' => 'api']);
        }

        $this->branch = Branch::factory()->create();

        $this->service = new SeniorityService(new VacationsLFTMX, app(ApplicationClock::class));
    }

    private function employeeWithPeriod(string $startDate, bool $active = true): Employee
    {
        $employee = Employee::factory()->create();
        EmploymentPeriod::factory()->create([
            'employee_id' => $employee->id,
            'branch_id' => $this->branch->id,
            'start_date' => $startDate,
            'end_date' => null,
            'termination_type' => null,
            'is_active' => $active,
        ]);

        return $employee;
    }

    // ── effectiveStartDate ────────────────────────────────────────────────────

    #[Test]
    public function effective_start_date_returns_single_period_start(): void
    {
        $employee = $this->employeeWithPeriod('2022-03-15');

        $result = $this->service->effectiveStartDate($employee);

        $this->assertEquals('2022-03-15', $result->toDateString());
    }

    #[Test]
    public function effective_start_date_accumulates_across_internal_transfer(): void
    {
        $employee = Employee::factory()->create();

        EmploymentPeriod::factory()->create([
            'employee_id' => $employee->id,
            'branch_id' => $this->branch->id,
            'start_date' => '2020-01-10',
            'end_date' => '2022-06-30',
            'termination_type' => TerminationType::InternalTransfer,
            'is_active' => false,
        ]);

        EmploymentPeriod::factory()->create([
            'employee_id' => $employee->id,
            'branch_id' => $this->branch->id,
            'start_date' => '2022-07-01',
            'end_date' => null,
            'termination_type' => null,
            'is_active' => true,
        ]);

        $result = $this->service->effectiveStartDate($employee);

        $this->assertEquals('2020-01-10', $result->toDateString());
    }

    #[Test]
    public function effective_start_date_resets_after_resignation(): void
    {
        $employee = Employee::factory()->create();

        EmploymentPeriod::factory()->create([
            'employee_id' => $employee->id,
            'branch_id' => $this->branch->id,
            'start_date' => '2018-05-01',
            'end_date' => '2021-12-31',
            'termination_type' => TerminationType::Resignation,
            'is_active' => false,
        ]);

        EmploymentPeriod::factory()->create([
            'employee_id' => $employee->id,
            'branch_id' => $this->branch->id,
            'start_date' => '2023-03-01',
            'end_date' => null,
            'termination_type' => null,
            'is_active' => true,
        ]);

        $result = $this->service->effectiveStartDate($employee);

        $this->assertEquals('2023-03-01', $result->toDateString());
    }

    #[Test]
    public function effective_start_date_resets_after_dismissal(): void
    {
        $employee = Employee::factory()->create();

        EmploymentPeriod::factory()->create([
            'employee_id' => $employee->id,
            'branch_id' => $this->branch->id,
            'start_date' => '2019-01-01',
            'end_date' => '2022-01-01',
            'termination_type' => TerminationType::Dismissal,
            'is_active' => false,
        ]);

        EmploymentPeriod::factory()->create([
            'employee_id' => $employee->id,
            'branch_id' => $this->branch->id,
            'start_date' => '2024-06-01',
            'end_date' => null,
            'termination_type' => null,
            'is_active' => true,
        ]);

        $result = $this->service->effectiveStartDate($employee);

        $this->assertEquals('2024-06-01', $result->toDateString());
    }

    // ── completedYears ────────────────────────────────────────────────────────

    #[Test]
    public function completed_years_returns_zero_before_first_anniversary(): void
    {
        $employee = $this->employeeWithPeriod('2026-01-01');

        $result = $this->service->completedYears($employee, Carbon::parse('2026-06-01'));

        $this->assertEquals(0, $result);
    }

    #[Test]
    public function completed_years_returns_correct_count_on_anniversary(): void
    {
        $employee = $this->employeeWithPeriod('2022-08-20');

        $result = $this->service->completedYears($employee, Carbon::parse('2026-08-20'));

        $this->assertEquals(4, $result);
    }

    #[Test]
    public function completed_years_does_not_count_partial_year(): void
    {
        $employee = $this->employeeWithPeriod('2022-08-20');

        $result = $this->service->completedYears($employee, Carbon::parse('2026-08-19'));

        $this->assertEquals(3, $result);
    }

    // ── default $at reads the Application Clock, not the OS clock ──────────────

    #[Test]
    public function completed_years_defaults_to_the_simulated_application_clock_date(): void
    {
        // No Carbon::setTestNow() here on purpose — this proves completedYears()'s
        // default reads the DB-backed simulated clock, not PHP's real system time.
        ApplicationClockState::current()->update([
            'mode' => ClockMode::SIMULATED,
            'base_datetime_utc' => '2026-12-01T12:00:00Z',
            'started_real_datetime_utc' => now(),
        ]);

        // Anniversary reached one day before the simulated "now" (2026-12-01) —
        // would NOT be reached yet under the real system clock during normal test runs.
        $employee = $this->employeeWithPeriod('2025-11-30');

        $result = $this->service->completedYears($employee);

        $this->assertEquals(1, $result);
    }

    #[Test]
    public function next_anniversary_defaults_to_the_simulated_application_clock_date(): void
    {
        ApplicationClockState::current()->update([
            'mode' => ClockMode::SIMULATED,
            'base_datetime_utc' => '2026-12-01T12:00:00Z',
            'started_real_datetime_utc' => now(),
        ]);

        $employee = $this->employeeWithPeriod('2025-11-30');

        $result = $this->service->nextAnniversary($employee);

        $this->assertEquals('2027-11-30', $result['date']);
        $this->assertEquals(2, $result['seniority_year']);
    }

    // ── nextAnniversary ───────────────────────────────────────────────────────

    #[Test]
    public function next_anniversary_returns_correct_date_and_seniority_year(): void
    {
        $employee = $this->employeeWithPeriod('2024-08-20');

        $result = $this->service->nextAnniversary($employee, Carbon::parse('2026-06-01'));

        $this->assertEquals('2026-08-20', $result['date']);
        $this->assertEquals(2, $result['seniority_year']);
        $this->assertEquals(14, $result['entitled_days']);
    }

    #[Test]
    public function next_anniversary_on_day_after_anniversary_points_to_next_year(): void
    {
        $employee = $this->employeeWithPeriod('2024-08-20');

        $result = $this->service->nextAnniversary($employee, Carbon::parse('2026-08-21'));

        $this->assertEquals('2027-08-20', $result['date']);
        $this->assertEquals(3, $result['seniority_year']);
        $this->assertEquals(16, $result['entitled_days']);
    }
}
