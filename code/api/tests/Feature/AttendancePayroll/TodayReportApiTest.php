<?php

namespace Tests\Feature\AttendancePayroll;

use App\Models\Attendance;
use App\Models\Branch;
use App\Models\Employee;
use App\Models\EmploymentPeriod;
use App\Models\Leave;
use App\Models\LeaveType;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

/**
 * Feature tests for GET /api/v1/reports/today?branch_id=
 *
 * Covers:
 *   - Happy path: returns all active employees with operational status
 *   - Summary totals: total_employees, arrived, not_arrived, late_count
 *   - Mixed statuses: arrived, late, not_arrived, on_leave, day_off
 *   - Empty branch: returns empty data with zero totals
 *   - 422 when branch_id is missing
 *   - 422 when branch_id is invalid
 *   - 401 when unauthenticated
 */
class TodayReportApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected Branch $branch;

    private string $today;

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
        $this->branch = Branch::factory()->create();
        $this->today = Carbon::today(config('app.business_timezone'))->toDateString();

        Passport::actingAs($this->user);
    }

    // #region Happy path

    #[Test]
    public function returns_200_with_data_and_summary_keys(): void
    {
        $response = $this->getJson("/api/v1/reports/today?branch_id={$this->branch->id}");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'data' => [
                    'summary' => [
                        'total_employees',
                        'arrived',
                        'not_arrived',
                        'late_count',
                    ],
                    'employees',
                ],
            ]);
    }

    #[Test]
    public function returns_correct_response_structure_per_employee(): void
    {
        $employee = $this->makeEmployeeForBranch($this->branch);

        Attendance::factory()->onDate($this->today)->create([
            'employee_id' => $employee->id,
            'check_in' => $this->today.'T09:00:00',
        ]);

        $response = $this->getJson("/api/v1/reports/today?branch_id={$this->branch->id}");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'employees' => [
                        '*' => [
                            'employee_id',
                            'name',
                            'code',
                            'role',
                            'status',
                            'check_in_time',
                            'late_minutes',
                            'has_overtime',
                            'overtime_authorized',
                        ],
                    ],
                ],
            ]);
    }

    #[Test]
    public function employee_with_check_in_on_time_has_arrived_status(): void
    {
        $employee = $this->makeEmployeeForBranch($this->branch);

        Attendance::factory()->onDate($this->today)->create([
            'employee_id' => $employee->id,
            'check_in' => $this->today.'T09:00:00',
            'entry_late_seconds' => 0,
        ]);

        $response = $this->getJson("/api/v1/reports/today?branch_id={$this->branch->id}");

        $row = collect($response->json('data.employees'))
            ->firstWhere('employee_id', $employee->public_id);

        $this->assertNotNull($row);
        $this->assertEquals('arrived', $row['status']);
        $this->assertEquals(0, $row['late_minutes']);
    }

    #[Test]
    public function employee_with_late_check_in_has_late_status(): void
    {
        $employee = $this->makeEmployeeForBranch($this->branch);

        Attendance::factory()->onDate($this->today)->create([
            'employee_id' => $employee->id,
            'check_in' => $this->today.'T09:15:00',
            'entry_late_seconds' => 900,  // 15 min late
        ]);

        $response = $this->getJson("/api/v1/reports/today?branch_id={$this->branch->id}");

        $row = collect($response->json('data.employees'))
            ->firstWhere('employee_id', $employee->public_id);

        $this->assertEquals('late', $row['status']);
        $this->assertEquals(15, $row['late_minutes']);
    }

    #[Test]
    public function employee_without_check_in_has_not_arrived_status(): void
    {
        $employee = $this->makeEmployeeForBranch($this->branch);

        $response = $this->getJson("/api/v1/reports/today?branch_id={$this->branch->id}");

        $row = collect($response->json('data.employees'))
            ->firstWhere('employee_id', $employee->public_id);

        $this->assertNotNull($row);
        $this->assertEquals('not_arrived', $row['status']);
        $this->assertNull($row['check_in_time']);
        $this->assertNull($row['late_minutes']);
    }

    #[Test]
    public function employee_with_approved_leave_has_on_leave_status(): void
    {
        $employee = $this->makeEmployeeForBranch($this->branch);
        $leaveType = LeaveType::factory()->create();

        Leave::factory()
            ->approved()
            ->openEnded()
            ->coveringDate($this->today)
            ->create([
                'employee_id' => $employee->id,
                'leave_type_id' => $leaveType->id,
                'requested_by' => $this->user->id,
            ]);

        $response = $this->getJson("/api/v1/reports/today?branch_id={$this->branch->id}");

        $row = collect($response->json('data.employees'))
            ->firstWhere('employee_id', $employee->public_id);

        $this->assertEquals('on_leave', $row['status']);
    }

    #[Test]
    public function employee_with_day_off_attendance_has_day_off_status(): void
    {
        $employee = $this->makeEmployeeForBranch($this->branch);

        Attendance::factory()->onDate($this->today)->dayOff()->create([
            'employee_id' => $employee->id,
        ]);

        $response = $this->getJson("/api/v1/reports/today?branch_id={$this->branch->id}");

        $row = collect($response->json('data.employees'))
            ->firstWhere('employee_id', $employee->public_id);

        $this->assertEquals('day_off', $row['status']);
    }

    #[Test]
    public function employee_with_overtime_has_has_overtime_true(): void
    {
        $employee = $this->makeEmployeeForBranch($this->branch);

        Attendance::factory()->onDate($this->today)->create([
            'employee_id' => $employee->id,
            'check_in' => $this->today.'T09:00:00',
            'overtime_minutes' => 45,
            'overtime_authorized' => false,
        ]);

        $response = $this->getJson("/api/v1/reports/today?branch_id={$this->branch->id}");

        $row = collect($response->json('data.employees'))
            ->firstWhere('employee_id', $employee->public_id);

        $this->assertTrue($row['has_overtime']);
        $this->assertFalse($row['overtime_authorized']);
    }

    #[Test]
    public function employee_name_contains_first_and_last_name(): void
    {
        $employee = $this->makeEmployeeForBranch($this->branch, firstName: 'Ana', lastName: 'García');

        $response = $this->getJson("/api/v1/reports/today?branch_id={$this->branch->id}");

        $row = collect($response->json('data.employees'))
            ->firstWhere('employee_id', $employee->public_id);

        $this->assertStringContainsString('Ana', $row['name']);
        $this->assertStringContainsString('García', $row['name']);
    }

    // #endregion

    // #region Summary totals

    #[Test]
    public function summary_totals_reflect_mixed_statuses(): void
    {
        // Employee 1: arrived on time
        $emp1 = $this->makeEmployeeForBranch($this->branch);
        Attendance::factory()->onDate($this->today)->create([
            'employee_id' => $emp1->id,
            'check_in' => $this->today.'T09:00:00',
            'entry_late_seconds' => 0,
        ]);

        // Employee 2: late
        $emp2 = $this->makeEmployeeForBranch($this->branch);
        Attendance::factory()->onDate($this->today)->create([
            'employee_id' => $emp2->id,
            'check_in' => $this->today.'T09:30:00',
            'entry_late_seconds' => 1800,
        ]);

        // Employee 3: not arrived yet
        $this->makeEmployeeForBranch($this->branch);

        $response = $this->getJson("/api/v1/reports/today?branch_id={$this->branch->id}");

        $summary = $response->json('data.summary');

        $this->assertEquals(3, $summary['total_employees']);
        $this->assertEquals(2, $summary['arrived']);    // on time + late both count as arrived
        $this->assertEquals(1, $summary['not_arrived']);
        $this->assertEquals(1, $summary['late_count']);
    }

    #[Test]
    public function summary_is_all_zeros_for_empty_branch(): void
    {
        $emptyBranch = Branch::factory()->create();

        $response = $this->getJson("/api/v1/reports/today?branch_id={$emptyBranch->id}");

        $response->assertStatus(200);

        $summary = $response->json('data.summary');
        $this->assertEquals(0, $summary['total_employees']);
        $this->assertEquals(0, $summary['arrived']);
        $this->assertEquals(0, $summary['not_arrived']);
        $this->assertEquals(0, $summary['late_count']);

        $this->assertCount(0, $response->json('data.employees'));
    }

    #[Test]
    public function on_leave_employees_count_as_not_arrived_in_summary(): void
    {
        $employee = $this->makeEmployeeForBranch($this->branch);
        $leaveType = LeaveType::factory()->create();

        Leave::factory()
            ->approved()
            ->openEnded()
            ->coveringDate($this->today)
            ->create([
                'employee_id' => $employee->id,
                'leave_type_id' => $leaveType->id,
                'requested_by' => $this->user->id,
            ]);

        $response = $this->getJson("/api/v1/reports/today?branch_id={$this->branch->id}");

        $summary = $response->json('data.summary');
        $this->assertEquals(1, $summary['total_employees']);
        $this->assertEquals(0, $summary['arrived']);
        $this->assertEquals(1, $summary['not_arrived']);
        $this->assertEquals(0, $summary['late_count']);
    }

    // #endregion

    // #region Validation

    #[Test]
    public function rejects_missing_branch_id(): void
    {
        $response = $this->getJson('/api/v1/reports/today');

        $response->assertStatus(422);
        $this->assertArrayHasKey('branch_id', $response->json('errors'));
    }

    #[Test]
    public function rejects_nonexistent_branch_id(): void
    {
        $response = $this->getJson('/api/v1/reports/today?branch_id=99999');

        $response->assertStatus(422);
        $this->assertArrayHasKey('branch_id', $response->json('errors'));
    }

    // #endregion

    // #region Auth

    #[Test]
    public function rejects_unauthenticated_request(): void
    {
        auth()->forgetGuards();

        $response = $this->getJson("/api/v1/reports/today?branch_id={$this->branch->id}");

        $response->assertStatus(401);
    }

    // #endregion

    // #region Helpers

    private function makeEmployeeForBranch(
        Branch $branch,
        string $firstName = '',
        string $lastName = '',
        bool $active = true,
    ): Employee {
        $period = EmploymentPeriod::factory()->create([
            'branch_id' => $branch->id,
            'is_active' => $active,
            'start_date' => '2026-01-01',
        ]);

        $employee = $period->employee;

        if ($firstName || $lastName) {
            $employee->update([
                'first_name' => $firstName ?: $employee->first_name,
                'last_name' => $lastName ?: $employee->last_name,
            ]);
            $employee->refresh();
        }

        return $employee;
    }

    // #endregion
}
