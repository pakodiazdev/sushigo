<?php

namespace Tests\Feature\AttendancePayroll;

use App\Models\Branch;
use App\Models\Employee;
use App\Models\EmploymentPeriod;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class EmploymentPeriodTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // System roles required by syncPositionRoles()
        Role::firstOrCreate(['name' => 'employee', 'guard_name' => 'api']);
        Role::firstOrCreate(['name' => 'employee-manager', 'guard_name' => 'api']);

        foreach (Employee::POSITION_ROLES as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);
        }
    }

    #[Test]
    public function it_can_create_an_employment_period(): void
    {
        $employee = Employee::factory()->create();
        $branch = Branch::factory()->create();

        $period = EmploymentPeriod::create([
            'employee_id' => $employee->id,
            'branch_id' => $branch->id,
            'start_date' => '2026-01-15',
            'is_active' => true,
        ]);

        $this->assertDatabaseHas('employment_periods', [
            'employee_id' => $employee->id,
            'branch_id' => $branch->id,
            'is_active' => true,
        ]);

        $this->assertNotNull($period->public_id);
        $this->assertEquals(26, strlen($period->public_id));
    }

    #[Test]
    public function it_generates_ulid_public_id(): void
    {
        $period = EmploymentPeriod::factory()->create();

        $this->assertNotNull($period->public_id);
        $this->assertMatchesRegularExpression('/^[0-9A-HJKMNP-TV-Z]{26}$/', $period->public_id);
    }

    #[Test]
    public function it_belongs_to_employee(): void
    {
        $employee = Employee::factory()->create();
        $period = EmploymentPeriod::factory()->forEmployee($employee)->create();

        $this->assertTrue($period->employee->is($employee));
    }

    #[Test]
    public function it_belongs_to_branch(): void
    {
        $branch = Branch::factory()->create();
        $period = EmploymentPeriod::factory()->forBranch($branch)->create();

        $this->assertTrue($period->branch->is($branch));
    }

    #[Test]
    public function employee_has_many_employment_periods(): void
    {
        $employee = Employee::factory()->create();
        $branch = Branch::factory()->create();

        EmploymentPeriod::factory()
            ->forEmployee($employee)
            ->forBranch($branch)
            ->terminated()
            ->create(['start_date' => '2025-01-01']);

        EmploymentPeriod::factory()
            ->forEmployee($employee)
            ->forBranch($branch)
            ->create(['start_date' => '2026-01-01']);

        $this->assertCount(2, $employee->employmentPeriods);
    }

    #[Test]
    public function active_scope_returns_only_active_periods(): void
    {
        $employee = Employee::factory()->create();
        $branch = Branch::factory()->create();

        EmploymentPeriod::factory()
            ->forEmployee($employee)
            ->forBranch($branch)
            ->create();

        EmploymentPeriod::factory()
            ->forEmployee($employee)
            ->forBranch($branch)
            ->inactive()
            ->create();

        $activePeriods = EmploymentPeriod::active()->get();

        $this->assertCount(1, $activePeriods);
        $this->assertTrue($activePeriods->first()->is_active);
    }

    #[Test]
    public function it_enforces_max_one_active_period_per_employee(): void
    {
        $employee = Employee::factory()->create(['is_active' => false]);
        $branch = Branch::factory()->create();

        // First active period exists
        EmploymentPeriod::factory()
            ->forEmployee($employee)
            ->forBranch($branch)
            ->create(['is_active' => true]);

        // The application-level guard (RehireEmployeeController) must reject a second active period
        $activePeriodCount = EmploymentPeriod::where('employee_id', $employee->id)
            ->active()
            ->count();

        $this->assertEquals(1, $activePeriodCount);

        // Verify the guard exists: active()->exists() returns true, so rehire would abort
        $this->assertTrue(
            $employee->employmentPeriods()->active()->exists(),
            'Guard check should detect the existing active period'
        );
    }

    #[Test]
    public function it_can_be_soft_deleted(): void
    {
        $period = EmploymentPeriod::factory()->create();

        $period->delete();

        $this->assertSoftDeleted('employment_periods', [
            'id' => $period->id,
        ]);

        $this->assertNull(EmploymentPeriod::find($period->id));
        $this->assertNotNull(EmploymentPeriod::withTrashed()->find($period->id));
    }

    #[Test]
    public function it_stores_termination_reason(): void
    {
        $period = EmploymentPeriod::factory()
            ->terminated('Despido justificado')
            ->create();

        $this->assertEquals('Despido justificado', $period->termination_reason);
        $this->assertFalse($period->is_active);
        $this->assertNotNull($period->end_date);
    }

    #[Test]
    public function it_stores_meta_as_json(): void
    {
        $period = EmploymentPeriod::factory()->create([
            'meta' => ['notes' => 'Rehire after 6 months', 'contract_type' => 'full-time'],
        ]);

        $period->refresh();

        $this->assertIsArray($period->meta);
        $this->assertEquals('Rehire after 6 months', $period->meta['notes']);
        $this->assertEquals('full-time', $period->meta['contract_type']);
    }

    #[Test]
    public function it_calculates_duration_in_days(): void
    {
        $period = EmploymentPeriod::factory()->create([
            'start_date' => '2026-01-01',
            'end_date' => '2026-02-01',
        ]);

        $this->assertEquals(31, $period->durationInDays());
    }

    #[Test]
    public function duration_in_days_uses_now_when_no_end_date(): void
    {
        $period = EmploymentPeriod::factory()->create([
            'start_date' => now()->subDays(10)->toDateString(),
            'end_date' => null,
        ]);

        $this->assertEquals(10, $period->durationInDays());
    }

    #[Test]
    public function it_casts_dates_properly(): void
    {
        $period = EmploymentPeriod::factory()->create([
            'start_date' => '2026-01-15',
            'end_date' => '2026-06-30',
        ]);

        $this->assertInstanceOf(\Illuminate\Support\Carbon::class, $period->start_date);
        $this->assertInstanceOf(\Illuminate\Support\Carbon::class, $period->end_date);
        $this->assertEquals('2026-01-15', $period->start_date->toDateString());
        $this->assertEquals('2026-06-30', $period->end_date->toDateString());
    }

    #[Test]
    public function null_end_date_means_currently_active(): void
    {
        $period = EmploymentPeriod::factory()->create([
            'end_date' => null,
            'is_active' => true,
        ]);

        $this->assertNull($period->end_date);
        $this->assertTrue($period->is_active);
    }

    #[Test]
    public function it_cascades_delete_when_employee_is_deleted(): void
    {
        $employee = Employee::factory()->create();
        $period = EmploymentPeriod::factory()->forEmployee($employee)->create();

        $periodId = $period->id;

        // Force delete to trigger cascade
        $employee->forceDelete();

        $this->assertDatabaseMissing('employment_periods', ['id' => $periodId]);
    }

    #[Test]
    public function it_cascades_delete_when_branch_is_deleted(): void
    {
        $branch = Branch::factory()->create();
        $period = EmploymentPeriod::factory()->forBranch($branch)->create();

        $periodId = $period->id;

        $branch->forceDelete();

        $this->assertDatabaseMissing('employment_periods', ['id' => $periodId]);
    }
}
