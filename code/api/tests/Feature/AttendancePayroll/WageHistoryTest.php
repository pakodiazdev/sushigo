<?php

namespace Tests\Feature\AttendancePayroll;

use App\Models\Employee;
use App\Models\WageHistory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class WageHistoryTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // System roles required by Employee factory (syncPositionRoles via EmployeeFactory)
        Role::firstOrCreate(['name' => 'employee',         'guard_name' => 'api']);
        Role::firstOrCreate(['name' => 'employee-manager', 'guard_name' => 'api']);

        foreach (Employee::POSITION_ROLES as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);
        }
    }

    // ── Effective scope ───────────────────────────────────────────────────────

    #[Test]
    public function effective_scope_returns_wage_whose_range_contains_the_date(): void
    {
        $employee = Employee::factory()->create();

        WageHistory::factory()->effectiveBetween('2026-01-01', '2026-01-31')->create([
            'employee_id' => $employee->id,
            'daily_wage'  => 500.00,
        ]);

        $result = WageHistory::effective('2026-01-15')->where('employee_id', $employee->id)->get();

        $this->assertCount(1, $result);
        $this->assertEquals('500.00', $result->first()->daily_wage);
    }

    #[Test]
    public function effective_scope_returns_open_ended_wage_for_any_date_after_effective_from(): void
    {
        $employee = Employee::factory()->create();

        WageHistory::factory()->effectiveBetween('2026-01-01', null)->create([
            'employee_id' => $employee->id,
            'daily_wage'  => 800.00,
        ]);

        // Still active today and in the future
        $result = WageHistory::effective('2026-06-30')->where('employee_id', $employee->id)->get();

        $this->assertCount(1, $result);
    }

    #[Test]
    public function effective_scope_excludes_wage_when_date_is_before_effective_from(): void
    {
        $employee = Employee::factory()->create();

        WageHistory::factory()->effectiveBetween('2026-02-01', null)->create([
            'employee_id' => $employee->id,
        ]);

        $result = WageHistory::effective('2026-01-31')->where('employee_id', $employee->id)->get();

        $this->assertCount(0, $result);
    }

    #[Test]
    public function effective_scope_excludes_wage_when_date_is_after_effective_to(): void
    {
        $employee = Employee::factory()->create();

        WageHistory::factory()->effectiveBetween('2026-01-01', '2026-01-31')->create([
            'employee_id' => $employee->id,
        ]);

        $result = WageHistory::effective('2026-02-01')->where('employee_id', $employee->id)->get();

        $this->assertCount(0, $result);
    }

    #[Test]
    public function effective_scope_returns_wage_on_boundary_dates(): void
    {
        $employee = Employee::factory()->create();

        WageHistory::factory()->effectiveBetween('2026-01-01', '2026-01-31')->create([
            'employee_id' => $employee->id,
            'daily_wage'  => 1000.00,
        ]);

        // Both boundary dates must be inclusive
        $this->assertCount(1, WageHistory::effective('2026-01-01')->where('employee_id', $employee->id)->get());
        $this->assertCount(1, WageHistory::effective('2026-01-31')->where('employee_id', $employee->id)->get());
    }

    #[Test]
    public function effective_scope_returns_only_the_wage_active_for_the_given_date(): void
    {
        $employee = Employee::factory()->create();

        // Closed old wage
        WageHistory::factory()->effectiveBetween('2025-01-01', '2025-12-31')->create([
            'employee_id' => $employee->id,
            'daily_wage'  => 600.00,
        ]);

        // Current active wage
        WageHistory::factory()->effectiveBetween('2026-01-01', null)->create([
            'employee_id' => $employee->id,
            'daily_wage'  => 900.00,
        ]);

        $result = WageHistory::effective('2026-02-15')->where('employee_id', $employee->id)->get();

        $this->assertCount(1, $result);
        $this->assertEquals('900.00', $result->first()->daily_wage);
    }

    #[Test]
    public function effective_scope_returns_all_matching_rows_when_closed_periods_overlap(): void
    {
        // The DB only prevents two *open-ended* wages (partial unique index).
        // Overlapping closed periods are not blocked at the schema level — the
        // application layer (FormRequest / Action) must enforce non-overlap.
        // This test documents that scopeEffective() returns ALL matching rows
        // and does not silently pick one; callers must handle the result set.
        $employee = Employee::factory()->create();

        WageHistory::factory()->effectiveBetween('2025-01-01', '2025-06-30')->create([
            'employee_id' => $employee->id,
            'daily_wage'  => 700.00,
        ]);

        WageHistory::factory()->effectiveBetween('2025-04-01', '2025-09-30')->create([
            'employee_id' => $employee->id,
            'daily_wage'  => 800.00,
        ]);

        // Both periods cover 2025-05-15, so the scope returns both rows
        $result = WageHistory::effective('2025-05-15')->where('employee_id', $employee->id)->get();

        $this->assertCount(2, $result);
    }

    // ── minuteRate() ──────────────────────────────────────────────────────────

    #[Test]
    public function minute_rate_calculates_daily_wage_divided_by_480(): void
    {
        $wage = WageHistory::factory()->withDailyWage(1000.00)->make();

        // 1000 / 480 ≈ 2.08333...
        $this->assertEqualsWithDelta(2.08333, $wage->minuteRate(), 0.0001);
    }

    #[Test]
    public function minute_rate_matches_acceptance_criteria_example(): void
    {
        // AC: $1 000/day → $2.083.../min
        $wage = WageHistory::factory()->withDailyWage(1000.00)->make();

        $rate = $wage->minuteRate();

        $this->assertGreaterThan(2.083, $rate);
        $this->assertLessThan(2.084, $rate);
    }

    #[Test]
    public function minute_rate_scales_correctly_with_different_wages(): void
    {
        $this->assertEqualsWithDelta(1000 / 480, WageHistory::factory()->withDailyWage(1000)->make()->minuteRate(), 0.000001);
        $this->assertEqualsWithDelta(500 / 480,  WageHistory::factory()->withDailyWage(500)->make()->minuteRate(),  0.000001);
        $this->assertEqualsWithDelta(2000 / 480, WageHistory::factory()->withDailyWage(2000)->make()->minuteRate(), 0.000001);
    }

    // ── Relationships ─────────────────────────────────────────────────────────

    #[Test]
    public function wage_history_belongs_to_employee(): void
    {
        $employee = Employee::factory()->create();
        $wage     = WageHistory::factory()->create(['employee_id' => $employee->id]);

        $this->assertTrue($wage->employee->is($employee));
    }

    #[Test]
    public function employee_has_many_wage_histories(): void
    {
        $employee = Employee::factory()->create();

        // Two closed periods + one open-ended: respects the partial unique index
        // that allows only one active (effective_to IS NULL) wage per employee.
        WageHistory::factory()->effectiveBetween('2024-01-01', '2024-06-30')->create(['employee_id' => $employee->id]);
        WageHistory::factory()->effectiveBetween('2024-07-01', '2024-12-31')->create(['employee_id' => $employee->id]);
        WageHistory::factory()->effectiveBetween('2025-01-01')->create(['employee_id' => $employee->id]);

        $this->assertCount(3, $employee->wageHistories);
    }

    // ── Casts & schema ────────────────────────────────────────────────────────

    #[Test]
    public function it_generates_ulid_public_id_on_create(): void
    {
        $wage = WageHistory::factory()->create();

        $this->assertNotNull($wage->public_id);
        $this->assertMatchesRegularExpression('/^[0-9A-HJKMNP-TV-Z]{26}$/', $wage->public_id);
    }

    #[Test]
    public function public_id_is_unique_per_record(): void
    {
        $wages = WageHistory::factory()->count(3)->create();

        $ids = $wages->pluck('public_id')->unique();

        $this->assertCount(3, $ids);
    }

    #[Test]
    public function daily_wage_is_cast_to_decimal_string(): void
    {
        $wage = WageHistory::factory()->withDailyWage(1250.50)->create();

        $wage->refresh();

        // decimal:2 cast returns a string representation of the decimal
        $this->assertEquals('1250.50', $wage->daily_wage);
    }

    #[Test]
    public function effective_from_and_to_are_cast_to_date(): void
    {
        $wage = WageHistory::factory()->effectiveBetween('2026-01-01', '2026-06-30')->create();

        $wage->refresh();

        $this->assertInstanceOf(\Illuminate\Support\Carbon::class, $wage->effective_from);
        $this->assertInstanceOf(\Illuminate\Support\Carbon::class, $wage->effective_to);
        $this->assertEquals('2026-01-01', $wage->effective_from->toDateString());
        $this->assertEquals('2026-06-30', $wage->effective_to->toDateString());
    }

    #[Test]
    public function null_effective_to_means_currently_active(): void
    {
        $wage = WageHistory::factory()->current()->create();

        $wage->refresh();

        $this->assertNull($wage->effective_to);
    }

    // ── Validation rules constant ─────────────────────────────────────────────

    #[Test]
    public function rules_constant_requires_daily_wage_to_be_greater_than_zero(): void
    {
        $rules = WageHistory::RULES;

        $this->assertArrayHasKey('daily_wage', $rules);
        $this->assertContains('gt:0', $rules['daily_wage']);
        $this->assertContains('numeric', $rules['daily_wage']);
        $this->assertContains('required', $rules['daily_wage']);
    }

    #[Test]
    public function rules_constant_requires_effective_from(): void
    {
        $rules = WageHistory::RULES;

        $this->assertArrayHasKey('effective_from', $rules);
        $this->assertContains('required', $rules['effective_from']);
        $this->assertContains('date', $rules['effective_from']);
    }

    #[Test]
    public function rules_constant_allows_nullable_effective_to_after_or_equal_effective_from(): void
    {
        $rules = WageHistory::RULES;

        $this->assertArrayHasKey('effective_to', $rules);
        $this->assertContains('nullable', $rules['effective_to']);
        $this->assertContains('after_or_equal:effective_from', $rules['effective_to']);
    }

    // ── Soft-delete & unique index ────────────────────────────────────────────

    #[Test]
    public function new_active_wage_can_be_created_after_soft_deleting_the_current_one(): void
    {
        // Regression: the partial unique index must exclude soft-deleted rows
        // (WHERE effective_to IS NULL AND deleted_at IS NULL), otherwise
        // soft-deleting an active wage and inserting a replacement would
        // violate the constraint even though Eloquent no longer sees the old row.
        $employee = Employee::factory()->create();

        $oldWage = WageHistory::factory()->effectiveBetween('2025-01-01')->create([
            'employee_id' => $employee->id,
        ]);

        $oldWage->delete(); // soft-delete — effective_to stays NULL, deleted_at is set

        // Must not throw a unique constraint violation
        $newWage = WageHistory::factory()->effectiveBetween('2026-01-01')->create([
            'employee_id' => $employee->id,
        ]);

        $this->assertDatabaseHas('wage_histories', ['id' => $newWage->id, 'deleted_at' => null]);
    }

    // ── Employee soft-delete ──────────────────────────────────────────────────

    #[Test]
    public function wage_records_survive_when_employee_is_soft_deleted(): void
    {
        $employee = Employee::factory()->create();
        $wage     = WageHistory::factory()->create(['employee_id' => $employee->id]);

        $employee->delete(); // soft-delete only

        // Wage row is still physically present (audit trail preserved)
        $this->assertDatabaseHas('wage_histories', ['id' => $wage->id]);

        // And still reachable via withTrashed() on the employee side
        $this->assertNotNull(
            WageHistory::where('id', $wage->id)->first()
        );
    }

    #[Test]
    public function force_deleting_employee_with_wage_records_is_restricted(): void
    {
        $employee = Employee::factory()->create();
        WageHistory::factory()->create(['employee_id' => $employee->id]);

        // DB-level RESTRICT prevents physical deletion while wage rows exist
        $this->expectException(\Illuminate\Database\QueryException::class);

        $employee->forceDelete();
    }
}
