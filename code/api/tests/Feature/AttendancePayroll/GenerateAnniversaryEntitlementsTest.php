<?php

namespace Tests\Feature\AttendancePayroll;

use App\Models\Branch;
use App\Models\Employee;
use App\Models\EmploymentPeriod;
use App\Models\VacationEntitlement;
use App\Support\Clock\ApplicationClock;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class GenerateAnniversaryEntitlementsTest extends TestCase
{
    use RefreshDatabase;

    private Branch $branch;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (Employee::POSITION_ROLES as $role) {
            Role::firstOrCreate(['name' => $role, 'guard_name' => 'api']);
        }

        $this->branch = Branch::factory()->create();
    }

    /**
     * "Today" per the business timezone the seniority calculation uses —
     * not Carbon::today() (server/UTC timezone), which can be a day ahead
     * of the business timezone and produce off-by-one anniversary counts.
     */
    private function businessToday(): Carbon
    {
        return Carbon::parse(app(ApplicationClock::class)->todayInBusinessTz());
    }

    private function employeeStartedOn(string $startDate): Employee
    {
        $employee = Employee::factory()->create(['is_active' => true]);
        EmploymentPeriod::factory()->create([
            'employee_id' => $employee->id,
            'branch_id' => $this->branch->id,
            'start_date' => $startDate,
            'end_date' => null,
            'termination_type' => null,
            'is_active' => true,
        ]);

        return $employee;
    }

    // ── happy path ────────────────────────────────────────────────────────────

    #[Test]
    public function it_creates_entitlements_for_all_past_anniversaries(): void
    {
        // Employee started 3 years ago → should create 3 entitlements
        $startDate = $this->businessToday()->subYears(3)->toDateString();
        $employee = $this->employeeStartedOn($startDate);

        $this->artisan('vacation:generate-entitlements')
            ->assertExitCode(0);

        $this->assertDatabaseCount('vacation_entitlements', 3);

        $entitlements = VacationEntitlement::where('employee_id', $employee->id)
            ->orderBy('year')
            ->get();

        $this->assertEquals(12, $entitlements[0]->entitled_days); // year 1 → LFT
        $this->assertEquals(14, $entitlements[1]->entitled_days); // year 2
        $this->assertEquals(16, $entitlements[2]->entitled_days); // year 3
        $this->assertEquals('VacationsLFTMX', $entitlements[0]->rule_key);
    }

    #[Test]
    public function it_skips_employees_with_no_completed_years(): void
    {
        $this->employeeStartedOn($this->businessToday()->subMonths(6)->toDateString());

        $this->artisan('vacation:generate-entitlements')
            ->assertExitCode(0);

        $this->assertDatabaseCount('vacation_entitlements', 0);
    }

    #[Test]
    public function it_skips_years_already_registered(): void
    {
        $startDate = $this->businessToday()->subYears(2)->toDateString();
        $employee = $this->employeeStartedOn($startDate);

        // Pre-existing entitlement for year 1
        $year1 = Carbon::parse($startDate)->addYear()->year;
        VacationEntitlement::create([
            'employee_id' => $employee->id,
            'year' => $year1,
            'entitled_days' => 12,
            'used_days' => 0,
            'rule_key' => 'VacationsLFTMX',
        ]);

        $this->artisan('vacation:generate-entitlements')
            ->assertExitCode(0);

        // Only year 2 should be created (year 1 was pre-existing)
        $this->assertDatabaseCount('vacation_entitlements', 2);
    }

    #[Test]
    public function it_filters_by_employee_option(): void
    {
        $startDate = $this->businessToday()->subYears(2)->toDateString();
        $employeeA = $this->employeeStartedOn($startDate);
        $employeeB = $this->employeeStartedOn($startDate);

        $this->artisan('vacation:generate-entitlements', ['--employee' => $employeeA->id])
            ->assertExitCode(0);

        $this->assertDatabaseHas('vacation_entitlements', ['employee_id' => $employeeA->id]);
        $this->assertDatabaseMissing('vacation_entitlements', ['employee_id' => $employeeB->id]);
    }

    #[Test]
    public function dry_run_does_not_persist_records(): void
    {
        $startDate = $this->businessToday()->subYears(2)->toDateString();
        $this->employeeStartedOn($startDate);

        $this->artisan('vacation:generate-entitlements', ['--dry-run' => true])
            ->assertExitCode(0);

        $this->assertDatabaseCount('vacation_entitlements', 0);
    }
}
