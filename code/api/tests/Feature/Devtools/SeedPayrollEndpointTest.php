<?php

namespace Tests\Feature\Devtools;

use App\Exceptions\ClockSimulationMisconfigurationException;
use App\Models\Branch;
use App\Models\Employee;
use App\Models\EmploymentPeriod;
use App\Models\OvertimeBankMovement;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Laravel\Passport\Passport;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class SeedPayrollEndpointTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected Branch $branch;

    protected string $periodStart = '2026-06-23';

    protected string $periodEnd = '2026-06-29';

    protected function setUp(): void
    {
        parent::setUp();

        Config::set('payroll_seed.enabled', true);
        Config::set('payroll_seed.allowed_environments', 'testing');

        foreach (Employee::POSITION_ROLES as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);
        }

        $this->user = User::factory()->create();
        $this->branch = Branch::factory()->create();

        Passport::actingAs($this->user);
    }

    private function createActiveEmployee(): Employee
    {
        $employee = Employee::factory()->create(['is_active' => true]);
        EmploymentPeriod::factory()->create([
            'employee_id' => $employee->id,
            'branch_id' => $this->branch->id,
            'is_active' => true,
        ]);

        return $employee;
    }

    // ── 404 guard ─────────────────────────────────────────────────────────────

    public function test_returns_404_when_payroll_seed_disabled(): void
    {
        Config::set('payroll_seed.enabled', false);

        $this->postJson('/api/v1/devtools/payroll/seed', [
            'branch_id' => $this->branch->id,
            'period_start' => $this->periodStart,
            'period_end' => $this->periodEnd,
            'scenario' => 'full_week',
        ])->assertNotFound();
    }

    public function test_returns_404_when_environment_not_allowed(): void
    {
        Config::set('payroll_seed.allowed_environments', 'local,devtest');

        $this->postJson('/api/v1/devtools/payroll/seed', [
            'branch_id' => $this->branch->id,
            'period_start' => $this->periodStart,
            'period_end' => $this->periodEnd,
            'scenario' => 'full_week',
        ])->assertNotFound();
    }

    // ── Validation ────────────────────────────────────────────────────────────

    public function test_returns_422_when_branch_id_missing(): void
    {
        $this->postJson('/api/v1/devtools/payroll/seed', [
            'period_start' => $this->periodStart,
            'period_end' => $this->periodEnd,
            'scenario' => 'full_week',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['branch_id']);
    }

    public function test_returns_422_when_scenario_invalid(): void
    {
        $this->postJson('/api/v1/devtools/payroll/seed', [
            'branch_id' => $this->branch->id,
            'period_start' => $this->periodStart,
            'period_end' => $this->periodEnd,
            'scenario' => 'not_a_real_scenario',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['scenario']);
    }

    public function test_returns_422_when_period_end_before_period_start(): void
    {
        $this->postJson('/api/v1/devtools/payroll/seed', [
            'branch_id' => $this->branch->id,
            'period_start' => '2026-06-29',
            'period_end' => '2026-06-23',
            'scenario' => 'full_week',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['period_end']);
    }

    // ── Happy path ────────────────────────────────────────────────────────────

    public function test_seed_full_week_creates_5_attendances_per_employee(): void
    {
        $employee = $this->createActiveEmployee();

        $response = $this->postJson('/api/v1/devtools/payroll/seed', [
            'branch_id' => $this->branch->id,
            'period_start' => $this->periodStart,
            'period_end' => $this->periodEnd,
            'scenario' => 'full_week',
        ]);

        $response->assertOk()
            ->assertJsonPath('status', 'ok')
            ->assertJsonPath('data.created', 5);

        $this->assertDatabaseCount('attendances', 5);
        $this->assertDatabaseHas('attendances', [
            'employee_id' => $employee->id,
            'day_status' => 'WORKED',
        ]);
    }

    public function test_seed_with_lates_creates_late_deductions(): void
    {
        $this->createActiveEmployee();

        $response = $this->postJson('/api/v1/devtools/payroll/seed', [
            'branch_id' => $this->branch->id,
            'period_start' => $this->periodStart,
            'period_end' => $this->periodEnd,
            'scenario' => 'with_lates',
        ]);

        $response->assertOk();

        // Mon and Wed (indices 0, 2) have 35 min late entry
        $this->assertDatabaseHas('attendances', [
            'entry_late_seconds' => 2100,
        ]);
    }

    public function test_seed_with_unpaid_leave_creates_partial_leave_record(): void
    {
        $employee = $this->createActiveEmployee();

        $this->postJson('/api/v1/devtools/payroll/seed', [
            'branch_id' => $this->branch->id,
            'period_start' => $this->periodStart,
            'period_end' => $this->periodEnd,
            'scenario' => 'with_unpaid_leave',
        ])->assertOk();

        $this->assertDatabaseHas('partial_leaves', [
            'employee_id' => $employee->id,
            'is_paid' => false,
            'duration_minutes' => 240,
        ]);
    }

    public function test_seed_with_overtime_creates_paid_overtime_bank_movements(): void
    {
        $employee = $this->createActiveEmployee();

        $this->postJson('/api/v1/devtools/payroll/seed', [
            'branch_id' => $this->branch->id,
            'period_start' => $this->periodStart,
            'period_end' => $this->periodEnd,
            'scenario' => 'with_overtime',
        ])->assertOk();

        // Tue, Thu, Fri (3 days) get OvertimeBankMovement PAID
        $this->assertDatabaseCount('overtime_bank_movements', 3);
        $this->assertDatabaseHas('overtime_bank_movements', [
            'employee_id' => $employee->id,
            'movement_type' => 'PAID',
            'minutes' => 120,
        ]);
    }

    public function test_seed_with_absences_creates_absence_records(): void
    {
        $this->createActiveEmployee();

        $this->postJson('/api/v1/devtools/payroll/seed', [
            'branch_id' => $this->branch->id,
            'period_start' => $this->periodStart,
            'period_end' => $this->periodEnd,
            'scenario' => 'with_absences',
        ])->assertOk();

        $this->assertDatabaseHas('attendances', [
            'day_status' => 'ABSENCE',
        ]);
    }

    public function test_seed_resets_existing_attendances_before_creating(): void
    {
        $employee = $this->createActiveEmployee();

        // Seed once
        $this->postJson('/api/v1/devtools/payroll/seed', [
            'branch_id' => $this->branch->id,
            'period_start' => $this->periodStart,
            'period_end' => $this->periodEnd,
            'scenario' => 'full_week',
        ])->assertOk();

        $this->assertDatabaseCount('attendances', 5);

        // Seed again — should still be 5, not 10
        $this->postJson('/api/v1/devtools/payroll/seed', [
            'branch_id' => $this->branch->id,
            'period_start' => $this->periodStart,
            'period_end' => $this->periodEnd,
            'scenario' => 'full_week',
        ])->assertOk();

        $this->assertDatabaseCount('attendances', 5);
    }

    public function test_seed_returns_employee_codes_in_response(): void
    {
        $employee = $this->createActiveEmployee();

        $response = $this->postJson('/api/v1/devtools/payroll/seed', [
            'branch_id' => $this->branch->id,
            'period_start' => $this->periodStart,
            'period_end' => $this->periodEnd,
            'scenario' => 'full_week',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.employees.0', $employee->code);
    }

    public function test_seed_ignores_employees_from_other_branches(): void
    {
        $this->createActiveEmployee();

        $otherBranch = Branch::factory()->create();
        $otherEmployee = Employee::factory()->create(['is_active' => true]);
        EmploymentPeriod::factory()->create([
            'employee_id' => $otherEmployee->id,
            'branch_id' => $otherBranch->id,
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/v1/devtools/payroll/seed', [
            'branch_id' => $this->branch->id,
            'period_start' => $this->periodStart,
            'period_end' => $this->periodEnd,
            'scenario' => 'full_week',
        ]);

        // Only 5 records (1 employee, 5 days) not 10
        $response->assertOk()->assertJsonPath('data.created', 5);
    }

    public function test_seed_returns_empty_result_when_no_active_employees(): void
    {
        $this->postJson('/api/v1/devtools/payroll/seed', [
            'branch_id' => $this->branch->id,
            'period_start' => $this->periodStart,
            'period_end' => $this->periodEnd,
            'scenario' => 'full_week',
        ])->assertOk()
            ->assertJsonPath('data.created', 0)
            ->assertJsonPath('data.employees', []);
    }

    public function test_seed_mixed_scenario_with_7_employees_covers_all_slots(): void
    {
        // 7 employees exercise all mixedRow slots (% 7: 0–6), including
        // lunchLateOrWorkedRow (slot 5) and combinedRow (slot 6)
        for ($i = 0; $i < 7; $i++) {
            $this->createActiveEmployee();
        }

        $this->postJson('/api/v1/devtools/payroll/seed', [
            'branch_id' => $this->branch->id,
            'period_start' => $this->periodStart,
            'period_end' => $this->periodEnd,
            'scenario' => 'mixed',
        ])->assertOk()
            ->assertJsonPath('data.created', 35); // 7 employees × 5 days
    }

    public function test_raises_misconfiguration_exception_when_production_in_allowed_environments(): void
    {
        Config::set('payroll_seed.allowed_environments', 'testing,production');

        $this->expectException(ClockSimulationMisconfigurationException::class);

        $this->withoutExceptionHandling()->postJson('/api/v1/devtools/payroll/seed', [
            'branch_id' => $this->branch->id,
            'period_start' => $this->periodStart,
            'period_end' => $this->periodEnd,
            'scenario' => 'full_week',
        ]);
    }
}
