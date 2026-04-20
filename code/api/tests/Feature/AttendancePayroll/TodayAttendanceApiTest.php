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

class TodayAttendanceApiTest extends TestCase
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
        // Use business timezone to match what the API expects (same as TodayAttendanceController)
        $this->today = Carbon::today(config('app.business_timezone'))->toDateString();

        Passport::actingAs($this->user);
    }

    // #region Happy path

    #[Test]
    public function returns_all_active_employees_for_branch(): void
    {
        // Two active employees in our branch
        $emp1 = $this->makeEmployeeForBranch($this->branch);
        $emp2 = $this->makeEmployeeForBranch($this->branch);

        $response = $this->getJson("/api/v1/attendances/today?branch_id={$this->branch->id}");

        $response->assertStatus(200);
        $this->assertCount(2, $response->json('data'));
    }

    #[Test]
    public function employees_without_attendance_have_null_attendance(): void
    {
        $employee = $this->makeEmployeeForBranch($this->branch);

        $response = $this->getJson("/api/v1/attendances/today?branch_id={$this->branch->id}");

        $response->assertStatus(200);

        $row = collect($response->json('data'))
            ->firstWhere('employee.id', $employee->public_id);

        $this->assertNotNull($row);
        $this->assertNull($row['attendance']);
    }

    #[Test]
    public function employees_with_check_in_show_attendance_data(): void
    {
        $employee = $this->makeEmployeeForBranch($this->branch);

        Attendance::factory()->onDate($this->today)->create([
            'employee_id' => $employee->id,
            'check_in' => $this->today.'T09:15:00',
            'entry_late_seconds' => 900,  // 15 min late
        ]);

        $response = $this->getJson("/api/v1/attendances/today?branch_id={$this->branch->id}");

        $response->assertStatus(200);

        $row = collect($response->json('data'))
            ->firstWhere('employee.id', $employee->public_id);

        $this->assertNotNull($row['attendance']);
        $this->assertEquals(900, $row['attendance']['entry_late_seconds']);
        $this->assertEquals('WORKED', $row['attendance']['day_status']);
    }

    #[Test]
    public function mixed_scenario_some_checked_in_some_not(): void
    {
        $checked = $this->makeEmployeeForBranch($this->branch);
        $pending = $this->makeEmployeeForBranch($this->branch);

        Attendance::factory()->onDate($this->today)->create([
            'employee_id' => $checked->id,
            'check_in' => $this->today.'T09:00:00',
        ]);

        $response = $this->getJson("/api/v1/attendances/today?branch_id={$this->branch->id}");

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertCount(2, $data);

        $checkedRow = collect($data)->firstWhere('employee.id', $checked->public_id);
        $pendingRow = collect($data)->firstWhere('employee.id', $pending->public_id);

        $this->assertNotNull($checkedRow['attendance']);
        $this->assertNull($pendingRow['attendance']);
    }

    #[Test]
    public function excludes_employees_from_other_branch(): void
    {
        $otherBranch = Branch::factory()->create();

        // One employee in our branch, one in other branch
        $this->makeEmployeeForBranch($this->branch);
        $this->makeEmployeeForBranch($otherBranch);

        $response = $this->getJson("/api/v1/attendances/today?branch_id={$this->branch->id}");

        $response->assertStatus(200);
        $this->assertCount(1, $response->json('data'));
    }

    #[Test]
    public function returns_empty_list_for_branch_with_no_employees(): void
    {
        $emptyBranch = Branch::factory()->create();

        $response = $this->getJson("/api/v1/attendances/today?branch_id={$emptyBranch->id}");

        $response->assertStatus(200);
        $this->assertCount(0, $response->json('data'));
    }

    #[Test]
    public function returns_correct_response_structure(): void
    {
        $employee = $this->makeEmployeeForBranch($this->branch);

        Attendance::factory()->onDate($this->today)->create([
            'employee_id' => $employee->id,
            'check_in' => $this->today.'T09:00:00',
        ]);

        $response = $this->getJson("/api/v1/attendances/today?branch_id={$this->branch->id}");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'data' => [
                    '*' => [
                        'employee' => [
                            'id',
                            'code',
                            'first_name',
                            'last_name',
                            'roles',
                            'daily_wage',
                        ],
                        'attendance' => [
                            'id',
                            'check_in',
                            'lunch_start',
                            'lunch_end',
                            'check_out',
                            'day_status',
                            'entry_late_seconds',
                            'entry_late_minutes',
                            'is_entry_deductible',
                            'overtime_minutes',
                            'requires_overtime_decision',
                        ],
                    ],
                ],
            ]);

        $this->assertEquals(26, strlen($response->json('data.0.employee.id')));
    }

    #[Test]
    public function orders_by_last_name_then_first_name(): void
    {
        // Create employees with known names
        $emp1 = $this->makeEmployeeForBranch($this->branch, firstName: 'Carlos', lastName: 'Zamora');
        $emp2 = $this->makeEmployeeForBranch($this->branch, firstName: 'Ana', lastName: 'Acosta');
        $emp3 = $this->makeEmployeeForBranch($this->branch, firstName: 'Beto', lastName: 'Acosta');

        $response = $this->getJson("/api/v1/attendances/today?branch_id={$this->branch->id}");

        $data = $response->json('data');
        $names = collect($data)->pluck('employee.last_name')->all();

        // Acosta, Acosta, Zamora
        $this->assertEquals(['Acosta', 'Acosta', 'Zamora'], $names);

        // Within Acosta: Ana before Beto
        $this->assertEquals('Ana', $data[0]['employee']['first_name']);
        $this->assertEquals('Beto', $data[1]['employee']['first_name']);
    }

    #[Test]
    public function excludes_inactive_employees(): void
    {
        $activeEmp = $this->makeEmployeeForBranch($this->branch);
        $inactiveEmp = $this->makeEmployeeForBranch($this->branch, active: false);

        $response = $this->getJson("/api/v1/attendances/today?branch_id={$this->branch->id}");

        $response->assertStatus(200);
        $this->assertCount(1, $response->json('data'));

        $ids = collect($response->json('data'))->pluck('employee.id')->all();
        $this->assertContains($activeEmp->public_id, $ids);
        $this->assertNotContains($inactiveEmp->public_id, $ids);
    }

    // #endregion

    // #region Validation

    #[Test]
    public function rejects_missing_branch_id(): void
    {
        $response = $this->getJson('/api/v1/attendances/today');

        $response->assertStatus(422);
        $this->assertArrayHasKey('branch_id', $response->json('errors'));
    }

    #[Test]
    public function rejects_nonexistent_branch_id(): void
    {
        $response = $this->getJson('/api/v1/attendances/today?branch_id=99999');

        $response->assertStatus(422);
        $this->assertArrayHasKey('branch_id', $response->json('errors'));
    }

    // #endregion

    // #region Auth

    #[Test]
    public function rejects_unauthenticated_request(): void
    {
        auth()->forgetGuards();

        $response = $this->getJson("/api/v1/attendances/today?branch_id={$this->branch->id}");

        $response->assertStatus(401);
    }

    // #endregion

    // #region Today Leave

    #[Test]
    public function employee_with_approved_full_day_leave_has_today_leave_present(): void
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

        $response = $this->getJson("/api/v1/attendances/today?branch_id={$this->branch->id}");

        $row = collect($response->json('data'))
            ->firstWhere('employee.id', $employee->public_id);

        $this->assertNotNull($row['today_leave']);
        $this->assertEquals('OPEN_ENDED', $row['today_leave']['time_mode']);
        $this->assertNull($row['today_leave']['starts_at']);
        $this->assertNull($row['today_leave']['ends_at']);
    }

    #[Test]
    public function employee_with_approved_scheduled_leave_has_starts_at_and_ends_at(): void
    {
        $employee = $this->makeEmployeeForBranch($this->branch);
        $leaveType = LeaveType::factory()->proportionalHours()->create();

        Leave::factory()
            ->approved()
            ->scheduled('09:00:00', '14:00:00')
            ->coveringDate($this->today)
            ->create([
                'employee_id' => $employee->id,
                'leave_type_id' => $leaveType->id,
                'requested_by' => $this->user->id,
            ]);

        $response = $this->getJson("/api/v1/attendances/today?branch_id={$this->branch->id}");

        $row = collect($response->json('data'))
            ->firstWhere('employee.id', $employee->public_id);

        $this->assertNotNull($row['today_leave']);
        $this->assertEquals('SCHEDULED', $row['today_leave']['time_mode']);
        $this->assertEquals('PROPORTIONAL_HOURS', $row['today_leave']['calculation_mode']);
        $this->assertNotNull($row['today_leave']['starts_at']);
        $this->assertNotNull($row['today_leave']['ends_at']);
    }

    #[Test]
    public function employee_with_no_leave_has_null_today_leave(): void
    {
        $employee = $this->makeEmployeeForBranch($this->branch);

        $response = $this->getJson("/api/v1/attendances/today?branch_id={$this->branch->id}");

        $row = collect($response->json('data'))
            ->firstWhere('employee.id', $employee->public_id);

        $this->assertNull($row['today_leave']);
    }

    #[Test]
    public function pending_leave_does_not_appear_as_today_leave(): void
    {
        $employee = $this->makeEmployeeForBranch($this->branch);
        $leaveType = LeaveType::factory()->create();

        Leave::factory()
            ->openEnded()
            ->coveringDate($this->today)
            ->create([
                'employee_id' => $employee->id,
                'leave_type_id' => $leaveType->id,
                'requested_by' => $this->user->id,
                'status' => 'PENDING',
            ]);

        $response = $this->getJson("/api/v1/attendances/today?branch_id={$this->branch->id}");

        $row = collect($response->json('data'))
            ->firstWhere('employee.id', $employee->public_id);

        $this->assertNull($row['today_leave']);
    }

    #[Test]
    public function rejected_leave_does_not_appear_as_today_leave(): void
    {
        $employee = $this->makeEmployeeForBranch($this->branch);
        $leaveType = LeaveType::factory()->create();

        Leave::factory()
            ->rejected()
            ->openEnded()
            ->coveringDate($this->today)
            ->create([
                'employee_id' => $employee->id,
                'leave_type_id' => $leaveType->id,
                'requested_by' => $this->user->id,
            ]);

        $response = $this->getJson("/api/v1/attendances/today?branch_id={$this->branch->id}");

        $row = collect($response->json('data'))
            ->firstWhere('employee.id', $employee->public_id);

        $this->assertNull($row['today_leave']);
    }

    #[Test]
    public function paid_leave_has_is_paid_true(): void
    {
        $employee = $this->makeEmployeeForBranch($this->branch);
        $leaveType = LeaveType::factory()->create(['default_pay_percentage' => 100.00]);

        Leave::factory()
            ->approved()
            ->openEnded()
            ->coveringDate($this->today)
            ->create([
                'employee_id' => $employee->id,
                'leave_type_id' => $leaveType->id,
                'requested_by' => $this->user->id,
                'pay_percentage' => null,  // use type default (100%)
            ]);

        $response = $this->getJson("/api/v1/attendances/today?branch_id={$this->branch->id}");

        $row = collect($response->json('data'))
            ->firstWhere('employee.id', $employee->public_id);

        $this->assertTrue($row['today_leave']['is_paid']);
    }

    #[Test]
    public function unpaid_leave_has_is_paid_false(): void
    {
        $employee = $this->makeEmployeeForBranch($this->branch);
        $leaveType = LeaveType::factory()->unpaid()->create();

        Leave::factory()
            ->approved()
            ->openEnded()
            ->coveringDate($this->today)
            ->create([
                'employee_id' => $employee->id,
                'leave_type_id' => $leaveType->id,
                'requested_by' => $this->user->id,
            ]);

        $response = $this->getJson("/api/v1/attendances/today?branch_id={$this->branch->id}");

        $row = collect($response->json('data'))
            ->firstWhere('employee.id', $employee->public_id);

        $this->assertFalse($row['today_leave']['is_paid']);
    }

    // #endregion

    // #region Helpers

    /**
     * Create an employee with an active employment period in the given branch.
     */
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
