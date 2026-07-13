<?php

namespace Tests\Feature\AttendancePayroll;

use App\Models\Attendance;
use App\Models\Branch;
use App\Models\Employee;
use App\Models\EmploymentPeriod;
use App\Models\OvertimeBankMovement;
use App\Models\PartialLeave;
use App\Models\User;
use App\Models\WageHistory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class PreviewPayPeriodApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected Branch $branch;

    protected function setUp(): void
    {
        parent::setUp();

        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        Permission::create(['name' => 'payroll.preview', 'guard_name' => 'api']);

        foreach (Employee::POSITION_ROLES as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);
        }

        $adminRole = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'api']);
        $adminRole->givePermissionTo('payroll.preview');

        $this->user = User::factory()->create();
        $this->user->assignRole('admin');
        $this->branch = Branch::factory()->create();

        Passport::actingAs($this->user);
    }

    public function test_preview_returns_calculated_totals_for_active_employees(): void
    {
        $employee = Employee::factory()->create(['is_active' => true]);

        EmploymentPeriod::factory()->create([
            'employee_id' => $employee->id,
            'branch_id' => $this->branch->id,
            'is_active' => true,
        ]);

        WageHistory::factory()->effectiveBetween('2026-06-01')->create([
            'employee_id' => $employee->id,
            'hourly_rate' => 60.00,
            'weekly_scheduled_hours' => 48.0,
        ]);

        // One WORKED attendance on Mon 2026-06-22 with minor late entry (below threshold)
        Attendance::factory()->create([
            'employee_id' => $employee->id,
            'date' => '2026-06-22',
            'day_status' => 'WORKED',
            'entry_late_seconds' => 0,
            'lunch_late_seconds' => 0,
        ]);

        $response = $this->getJson('/api/v1/pay-periods/preview?branch_id='.$this->branch->id.'&period_start=2026-06-22&period_end=2026-06-28');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'data' => [
                    '*' => [
                        'employee',
                        'base_pay',
                        'late_deductions',
                        'unpaid_leave_deductions',
                        'overtime_pay',
                        'extra_day_pay',
                        'punctuality_bonus',
                        'holiday_pay',
                        'other_adjustments',
                        'total_pay',
                        'free_hours_earned',
                        'pay_period_lines',
                    ],
                ],
            ]);

        $this->assertCount(1, $response->json('data'));
        $employeeData = $response->json('data.0');
        $this->assertGreaterThanOrEqual(0, $employeeData['base_pay']);
        $this->assertEquals(0.0, (float) $employeeData['late_deductions']);
    }

    public function test_preview_does_not_persist_any_data(): void
    {
        $employee = Employee::factory()->create(['is_active' => true]);
        EmploymentPeriod::factory()->create([
            'employee_id' => $employee->id,
            'branch_id' => $this->branch->id,
            'is_active' => true,
        ]);
        WageHistory::factory()->effectiveBetween('2026-06-01')->create([
            'employee_id' => $employee->id,
        ]);

        $this->getJson('/api/v1/pay-periods/preview?branch_id='.$this->branch->id.'&period_start=2026-06-22&period_end=2026-06-28')
            ->assertStatus(200);

        $this->assertDatabaseCount('pay_periods', 0);
        $this->assertDatabaseCount('pay_period_employees', 0);
        $this->assertDatabaseCount('pay_period_lines', 0);
    }

    public function test_preview_excludes_employees_from_other_branches(): void
    {
        $otherBranch = Branch::factory()->create();

        $employee = Employee::factory()->create(['is_active' => true]);
        EmploymentPeriod::factory()->create([
            'employee_id' => $employee->id,
            'branch_id' => $otherBranch->id,
            'is_active' => true,
        ]);

        $response = $this->getJson('/api/v1/pay-periods/preview?branch_id='.$this->branch->id.'&period_start=2026-06-22&period_end=2026-06-28');

        $response->assertStatus(200);
        $this->assertCount(0, $response->json('data'));
    }

    public function test_preview_returns_403_without_permission(): void
    {
        $unprivilegedUser = User::factory()->create();
        Passport::actingAs($unprivilegedUser);

        $this->getJson('/api/v1/pay-periods/preview?branch_id='.$this->branch->id.'&period_start=2026-06-22&period_end=2026-06-28')
            ->assertStatus(403);
    }

    public function test_preview_returns_422_when_branch_id_missing(): void
    {
        $this->getJson('/api/v1/pay-periods/preview?period_start=2026-06-22&period_end=2026-06-28')
            ->assertStatus(422)
            ->assertJsonValidationErrors(['branch_id']);
    }

    public function test_preview_returns_422_when_period_dates_missing(): void
    {
        $this->getJson('/api/v1/pay-periods/preview?branch_id='.$this->branch->id)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['period_start', 'period_end']);
    }

    public function test_preview_returns_422_when_period_end_before_period_start(): void
    {
        $this->getJson('/api/v1/pay-periods/preview?branch_id='.$this->branch->id.'&period_start=2026-06-28&period_end=2026-06-22')
            ->assertStatus(422)
            ->assertJsonValidationErrors(['period_end']);
    }

    public function test_preview_returns_zero_base_pay_when_employee_has_no_wage_history(): void
    {
        $employee = Employee::factory()->create(['is_active' => true]);
        EmploymentPeriod::factory()->create([
            'employee_id' => $employee->id,
            'branch_id' => $this->branch->id,
            'is_active' => true,
        ]);

        $response = $this->getJson('/api/v1/pay-periods/preview?branch_id='.$this->branch->id.'&period_start=2026-06-22&period_end=2026-06-28');

        $response->assertStatus(200);
        $this->assertCount(1, $response->json('data'));
        $this->assertEquals(0.0, (float) $response->json('data.0.base_pay'));
    }

    public function test_preview_includes_late_deduction_line_when_entry_late_above_threshold(): void
    {
        $employee = Employee::factory()->create(['is_active' => true]);
        EmploymentPeriod::factory()->create([
            'employee_id' => $employee->id,
            'branch_id' => $this->branch->id,
            'is_active' => true,
        ]);
        WageHistory::factory()->effectiveBetween('2026-06-01')->create([
            'employee_id' => $employee->id,
            'hourly_rate' => 60.00,
        ]);
        Attendance::factory()->create([
            'employee_id' => $employee->id,
            'date' => '2026-06-22',
            'day_status' => 'WORKED',
            'entry_late_seconds' => 3600,
            'lunch_late_seconds' => 0,
        ]);

        $response = $this->getJson('/api/v1/pay-periods/preview?branch_id='.$this->branch->id.'&period_start=2026-06-22&period_end=2026-06-28');

        $response->assertStatus(200);
        $data = $response->json('data.0');
        $this->assertGreaterThan(0, (float) $data['late_deductions']);

        $lateLine = collect($data['pay_period_lines'])->firstWhere('concept', 'LATE_DEDUCTION');
        $this->assertNotNull($lateLine);
        $this->assertStringContainsString('Entry late', $lateLine['description']);
    }

    public function test_preview_includes_unpaid_leave_deduction_line(): void
    {
        $employee = Employee::factory()->create(['is_active' => true]);
        EmploymentPeriod::factory()->create([
            'employee_id' => $employee->id,
            'branch_id' => $this->branch->id,
            'is_active' => true,
        ]);
        WageHistory::factory()->effectiveBetween('2026-06-01')->create([
            'employee_id' => $employee->id,
            'hourly_rate' => 60.00,
        ]);
        Attendance::factory()->create([
            'employee_id' => $employee->id,
            'date' => '2026-06-22',
            'day_status' => 'WORKED',
            'entry_late_seconds' => 0,
            'lunch_late_seconds' => 0,
        ]);
        PartialLeave::factory()->create([
            'employee_id' => $employee->id,
            'date' => '2026-06-22',
            'duration_minutes' => 120,
            'is_paid' => false,
        ]);

        $response = $this->getJson('/api/v1/pay-periods/preview?branch_id='.$this->branch->id.'&period_start=2026-06-22&period_end=2026-06-28');

        $response->assertStatus(200);
        $data = $response->json('data.0');
        $this->assertGreaterThan(0, (float) $data['unpaid_leave_deductions']);

        $leaveLine = collect($data['pay_period_lines'])->firstWhere('concept', 'UNPAID_LEAVE');
        $this->assertNotNull($leaveLine);
    }

    public function test_preview_includes_overtime_pay_line_for_paid_movements(): void
    {
        $employee = Employee::factory()->create(['is_active' => true]);
        EmploymentPeriod::factory()->create([
            'employee_id' => $employee->id,
            'branch_id' => $this->branch->id,
            'is_active' => true,
        ]);
        WageHistory::factory()->effectiveBetween('2026-06-01')->create([
            'employee_id' => $employee->id,
            'hourly_rate' => 60.00,
        ]);
        OvertimeBankMovement::factory()->paid()->create([
            'employee_id' => $employee->id,
            'date' => '2026-06-22',
            'minutes' => 60,
        ]);

        $response = $this->getJson('/api/v1/pay-periods/preview?branch_id='.$this->branch->id.'&period_start=2026-06-22&period_end=2026-06-28');

        $response->assertStatus(200);
        $data = $response->json('data.0');
        $this->assertGreaterThan(0, (float) $data['overtime_pay']);

        $overtimeLine = collect($data['pay_period_lines'])->firstWhere('concept', 'OVERTIME');
        $this->assertNotNull($overtimeLine);
    }

    public function test_preview_returns_empty_data_when_no_active_employees_in_branch(): void
    {
        $response = $this->getJson('/api/v1/pay-periods/preview?branch_id='.$this->branch->id.'&period_start=2026-06-22&period_end=2026-06-28');

        $response->assertStatus(200);
        $this->assertCount(0, $response->json('data'));
    }
}
