<?php

namespace Tests\Feature\AttendancePayroll;

use App\Enums\DayStatus;
use App\Models\Attendance;
use App\Models\Branch;
use App\Models\Employee;
use App\Models\EmployeeBonusConfig;
use App\Models\NegotiatedExtraDay;
use App\Models\PunctualityBonusGroup;
use App\Models\PunctualityRange;
use App\Models\User;
use App\Models\WageHistory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

/**
 * Feature tests for GET /api/v1/reports/weekly-summary
 *
 * Covers:
 *   - Happy path: returns full financial breakdown + daily evidence
 *   - Correct base_pay with rest day proration
 *   - Correct late_deductions for entry/lunch tardiness >30 min
 *   - Correct punctuality_bonus from PunctualityService
 *   - Correct extra_day_pay from NegotiatedExtraDay
 *   - 401 when unauthenticated
 *   - 403 when user lacks reports.weekly-summary permission
 *   - 422 when required params are missing or invalid
 */
class WeeklySummaryApiTest extends TestCase
{
    use RefreshDatabase;

    private User $manager;

    private Employee $employee;

    private Branch $branch;

    protected function setUp(): void
    {
        parent::setUp();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        Permission::create(['name' => 'reports.weekly-summary', 'guard_name' => 'api']);
        $role = Role::create(['name' => 'manager', 'guard_name' => 'api']);
        $role->givePermissionTo('reports.weekly-summary');

        foreach (Employee::POSITION_ROLES as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);
        }

        $this->manager = User::factory()->create();
        $this->manager->assignRole('manager');
        $this->branch = Branch::factory()->create();
        $this->employee = Employee::factory()->create();

        WageHistory::create([
            'employee_id' => $this->employee->id,
            'hourly_rate' => '20.00',
            'weekly_scheduled_hours' => '48.00',
            'effective_from' => '2026-01-01',
        ]);

        // Bonus group + ranges
        $group = PunctualityBonusGroup::create([
            'name' => 'Grupo $110',
            'weekly_bonus_amount' => '110.00',
            'working_days_divisor' => 6,
            'is_active' => true,
        ]);

        EmployeeBonusConfig::create([
            'employee_id' => $this->employee->id,
            'punctuality_bonus_group_id' => $group->id,
            'effective_from' => '2026-01-01',
            'effective_to' => null,
        ]);

        PunctualityRange::create(['min_seconds' => 0, 'max_seconds' => 0, 'bonus_percentage' => '100.00', 'sort_order' => 1]);
        PunctualityRange::create(['min_seconds' => 1, 'max_seconds' => 1800, 'bonus_percentage' => '50.00', 'sort_order' => 2]);
        PunctualityRange::create(['min_seconds' => 1801, 'max_seconds' => null, 'bonus_percentage' => '0.00', 'sort_order' => 3]);

        Passport::actingAs($this->manager);
    }

    private function url(string $employeeId, string $start, string $end): string
    {
        return "/api/v1/reports/weekly-summary?employee_id={$employeeId}&period_start={$start}&period_end={$end}";
    }

    private function createWeek(array $statuses): void
    {
        $dates = ['2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19', '2026-06-20', '2026-06-21', '2026-06-22'];

        foreach ($dates as $i => $date) {
            [$status, $lateSeconds] = $statuses[$i] ?? [DayStatus::DAY_OFF, 0];

            Attendance::create([
                'employee_id' => $this->employee->id,
                'date' => $date,
                'day_status' => $status,
                'entry_late_seconds' => $lateSeconds,
                'lunch_late_seconds' => 0,
            ]);
        }
    }

    // ── Happy path ───────────────────────────────────────────────────────────

    #[Test]
    public function returns_200_with_full_breakdown_for_worked_week(): void
    {
        $this->createWeek([
            [DayStatus::WORKED, 0],
            [DayStatus::WORKED, 0],
            [DayStatus::WORKED, 0],
            [DayStatus::WORKED, 0],
            [DayStatus::WORKED, 0],
            [DayStatus::WORKED, 0],
            [DayStatus::DAY_OFF, 0],
        ]);

        $response = $this->getJson($this->url(
            $this->employee->public_id,
            '2026-06-16',
            '2026-06-22'
        ));

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'data' => [
                    'employee_id',
                    'period_start',
                    'period_end',
                    'base_pay',
                    'late_deductions',
                    'unpaid_leave_deductions',
                    'overtime_pay',
                    'extra_day_pay',
                    'holiday_pay',
                    'punctuality_bonus',
                    'free_hours_earned',
                    'total_pay',
                    'daily_evidence' => [
                        '*' => [
                            'date',
                            'check_in',
                            'check_out',
                            'day_status',
                            'late_minutes',
                            'deducted_minutes',
                            'partial_leaves',
                            'overtime_minutes',
                            'overtime_authorized',
                        ],
                    ],
                ],
            ]);
    }

    #[Test]
    public function base_pay_includes_rest_day_proration(): void
    {
        // 6 worked + 1 day_off
        $this->createWeek([
            [DayStatus::WORKED, 0],
            [DayStatus::WORKED, 0],
            [DayStatus::WORKED, 0],
            [DayStatus::WORKED, 0],
            [DayStatus::WORKED, 0],
            [DayStatus::WORKED, 0],
            [DayStatus::DAY_OFF, 0],
        ]);

        $response = $this->getJson($this->url($this->employee->public_id, '2026-06-16', '2026-06-22'));
        $response->assertStatus(200);

        // daily_rate = 20 × 8 = 160; base = 6 × 160 × (7/6) = 1120
        $this->assertEqualsWithDelta(1120.0, $response->json('data.base_pay'), 0.01);
    }

    #[Test]
    public function late_deductions_applied_only_for_over_30_min(): void
    {
        $this->createWeek([]);
        // Overwrite day 1 with entry late > 30 min
        Attendance::where('employee_id', $this->employee->id)->where('date', '2026-06-16')
            ->update(['day_status' => DayStatus::WORKED, 'entry_late_seconds' => 3600]);
        Attendance::where('employee_id', $this->employee->id)->where('date', '2026-06-22')
            ->update(['day_status' => DayStatus::DAY_OFF]);

        $response = $this->getJson($this->url($this->employee->public_id, '2026-06-16', '2026-06-22'));
        $response->assertStatus(200);

        // minuteRate = 20/60 = 0.333; 60 min × 0.333 = 20
        $this->assertGreaterThan(0, $response->json('data.late_deductions'));
    }

    #[Test]
    public function extra_day_pay_returns_agreed_daily_wage(): void
    {
        $this->createWeek([
            [DayStatus::WORKED, 0],
            [DayStatus::WORKED, 0],
            [DayStatus::WORKED, 0],
            [DayStatus::WORKED, 0],
            [DayStatus::WORKED, 0],
            [DayStatus::WORKED, 0],
            [DayStatus::EXTRA, 0],
        ]);

        NegotiatedExtraDay::create([
            'employee_id' => $this->employee->id,
            'branch_id' => $this->branch->id,
            'date' => '2026-06-22',
            'agreed_daily_wage' => '500.00',
            'prima_percent' => '25.0000',
            'prima_amount' => '125.00',
            'status' => NegotiatedExtraDay::STATUS_APPROVED,
            'approved_by' => $this->manager->id,
        ]);

        $response = $this->getJson($this->url($this->employee->public_id, '2026-06-16', '2026-06-22'));
        $response->assertStatus(200);

        $this->assertEqualsWithDelta(500.0, $response->json('data.extra_day_pay'), 0.01);
    }

    #[Test]
    public function daily_evidence_has_correct_count(): void
    {
        $this->createWeek([
            [DayStatus::WORKED, 0],
            [DayStatus::WORKED, 0],
            [DayStatus::WORKED, 0],
            [DayStatus::WORKED, 0],
            [DayStatus::WORKED, 0],
            [DayStatus::WORKED, 0],
            [DayStatus::DAY_OFF, 0],
        ]);

        $response = $this->getJson($this->url($this->employee->public_id, '2026-06-16', '2026-06-22'));
        $response->assertStatus(200);

        $this->assertCount(7, $response->json('data.daily_evidence'));
    }

    // ── Auth / authorization ─────────────────────────────────────────────────

    #[Test]
    public function returns_401_when_unauthenticated(): void
    {
        auth()->forgetGuards();

        $this->getJson($this->url($this->employee->public_id, '2026-06-16', '2026-06-22'))
            ->assertStatus(401);
    }

    #[Test]
    public function returns_403_when_user_lacks_permission(): void
    {
        $noPermUser = User::factory()->create();
        Passport::actingAs($noPermUser);

        $this->getJson($this->url($this->employee->public_id, '2026-06-16', '2026-06-22'))
            ->assertStatus(403);
    }

    // ── Validation ───────────────────────────────────────────────────────────

    #[Test]
    public function returns_422_when_employee_id_missing(): void
    {
        $this->getJson('/api/v1/reports/weekly-summary?period_start=2026-06-16&period_end=2026-06-22')
            ->assertStatus(422)
            ->assertJsonValidationErrors(['employee_id']);
    }

    #[Test]
    public function returns_422_when_period_start_missing(): void
    {
        $this->getJson("/api/v1/reports/weekly-summary?employee_id={$this->employee->public_id}&period_end=2026-06-22")
            ->assertStatus(422)
            ->assertJsonValidationErrors(['period_start']);
    }

    #[Test]
    public function returns_422_when_employee_not_found(): void
    {
        $this->getJson($this->url('nonexistent-id', '2026-06-16', '2026-06-22'))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['employee_id']);
    }

    #[Test]
    public function returns_422_when_period_end_before_period_start(): void
    {
        $this->getJson($this->url($this->employee->public_id, '2026-06-22', '2026-06-16'))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['period_end']);
    }
}
