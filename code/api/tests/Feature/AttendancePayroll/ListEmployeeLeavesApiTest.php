<?php

namespace Tests\Feature\AttendancePayroll;

use App\Enums\LeaveStatus;
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

class ListEmployeeLeavesApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected Employee $employee;

    private const DATE = '2026-04-09';

    protected function setUp(): void
    {
        parent::setUp();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        Permission::create(['name' => 'employees.view', 'guard_name' => 'api']);
        $role = Role::create(['name' => 'manager', 'guard_name' => 'api']);
        $role->givePermissionTo('employees.view');

        Role::firstOrCreate(['name' => 'employee', 'guard_name' => 'api']);
        foreach (Employee::POSITION_ROLES as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);
        }

        $this->user = User::factory()->create();
        $this->user->assignRole('manager');

        Passport::actingAs($this->user);

        $this->seedLeaveTypes();
        $this->employee = $this->makeEmployee();

        Carbon::setTestNow(Carbon::parse(self::DATE.' 10:00:00'));
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    // ── Happy path ────────────────────────────────────────────────────────────

    #[Test]
    public function lists_leaves_for_an_employee(): void
    {
        $this->createLeave($this->employee, LeaveType::MEDICAL, '2026-04-01');
        $this->createLeave($this->employee, LeaveType::PERSONAL, '2026-04-05');

        $response = $this->getJson("/api/v1/employees/{$this->employee->public_id}/leaves");

        $response->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('meta.total', 2);
    }

    #[Test]
    public function returns_correct_leave_fields(): void
    {
        $this->createLeave($this->employee, LeaveType::MEDICAL, '2026-04-01');

        $response = $this->getJson("/api/v1/employees/{$this->employee->public_id}/leaves");

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [['id', 'employee_id', 'leave_type' => ['id', 'code', 'name', 'calculation_mode'], 'start_date', 'end_date', 'resolved_pay_percentage', 'resolved_rest_day_factor', 'time_mode', 'status', 'requested_by', 'approved_by', 'approved_at', 'notes', 'created_at']],
                'meta' => ['current_page', 'last_page', 'per_page', 'total'],
            ]);
    }

    #[Test]
    public function does_not_include_leaves_from_other_employees(): void
    {
        $otherEmployee = $this->makeEmployee();
        $this->createLeave($this->employee, LeaveType::MEDICAL, '2026-04-01');
        $this->createLeave($otherEmployee, LeaveType::PERSONAL, '2026-04-02');

        $response = $this->getJson("/api/v1/employees/{$this->employee->public_id}/leaves");

        $response->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.leave_type.code', LeaveType::MEDICAL);
    }

    #[Test]
    public function returns_leaves_ordered_by_start_date_desc(): void
    {
        $this->createLeave($this->employee, LeaveType::MEDICAL, '2026-03-01');
        $this->createLeave($this->employee, LeaveType::PERSONAL, '2026-04-05');
        $this->createLeave($this->employee, LeaveType::PERMISSION_PAID, '2026-03-15');

        $response = $this->getJson("/api/v1/employees/{$this->employee->public_id}/leaves");

        $response->assertOk();
        $dates = collect($response->json('data'))->pluck('start_date')->toArray();
        $this->assertSame(['2026-04-05', '2026-03-15', '2026-03-01'], $dates);
    }

    // ── Filters ───────────────────────────────────────────────────────────────

    #[Test]
    public function filters_by_status(): void
    {
        $this->createLeave($this->employee, LeaveType::MEDICAL, '2026-04-01');
        $this->createLeave($this->employee, LeaveType::PERSONAL, '2026-04-02', LeaveStatus::CANCELLED);

        $response = $this->getJson("/api/v1/employees/{$this->employee->public_id}/leaves?status=APPROVED");

        $response->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.status', 'APPROVED');
    }

    #[Test]
    public function filters_by_date_from(): void
    {
        $this->createLeave($this->employee, LeaveType::MEDICAL, '2026-03-01');
        $this->createLeave($this->employee, LeaveType::PERSONAL, '2026-04-05');

        $response = $this->getJson("/api/v1/employees/{$this->employee->public_id}/leaves?date_from=2026-04-01");

        $response->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.start_date', '2026-04-05');
    }

    #[Test]
    public function filters_by_date_to(): void
    {
        $this->createLeave($this->employee, LeaveType::MEDICAL, '2026-03-01');
        $this->createLeave($this->employee, LeaveType::PERSONAL, '2026-04-05');

        $response = $this->getJson("/api/v1/employees/{$this->employee->public_id}/leaves?date_to=2026-03-31");

        $response->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.start_date', '2026-03-01');
    }

    #[Test]
    public function filters_by_date_range(): void
    {
        $this->createLeave($this->employee, LeaveType::MEDICAL, '2026-02-15');
        $this->createLeave($this->employee, LeaveType::PERSONAL, '2026-03-10');
        $this->createLeave($this->employee, LeaveType::PERMISSION_PAID, '2026-04-05');

        $response = $this->getJson("/api/v1/employees/{$this->employee->public_id}/leaves?date_from=2026-03-01&date_to=2026-03-31");

        $response->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.start_date', '2026-03-10');
    }

    #[Test]
    public function filters_by_leave_type_id(): void
    {
        $medicalType = LeaveType::where('code', LeaveType::MEDICAL)->first();
        $this->createLeave($this->employee, LeaveType::MEDICAL, '2026-04-01');
        $this->createLeave($this->employee, LeaveType::PERSONAL, '2026-04-02');

        $response = $this->getJson("/api/v1/employees/{$this->employee->public_id}/leaves?leave_type_id={$medicalType->id}");

        $response->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.leave_type.code', LeaveType::MEDICAL);
    }

    #[Test]
    public function filters_combine_correctly(): void
    {
        $this->createLeave($this->employee, LeaveType::MEDICAL, '2026-03-01');
        $this->createLeave($this->employee, LeaveType::MEDICAL, '2026-04-05');
        $this->createLeave($this->employee, LeaveType::PERSONAL, '2026-04-06');
        $this->createLeave($this->employee, LeaveType::MEDICAL, '2026-04-07', LeaveStatus::CANCELLED);

        $medicalType = LeaveType::where('code', LeaveType::MEDICAL)->first();

        $response = $this->getJson("/api/v1/employees/{$this->employee->public_id}/leaves?date_from=2026-04-01&status=APPROVED&leave_type_id={$medicalType->id}");

        $response->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.start_date', '2026-04-05');
    }

    // ── Pagination ────────────────────────────────────────────────────────────

    #[Test]
    public function paginates_results(): void
    {
        for ($i = 1; $i <= 20; $i++) {
            $this->createLeave($this->employee, LeaveType::MEDICAL, '2026-03-'.str_pad($i, 2, '0', STR_PAD_LEFT));
        }

        $response = $this->getJson("/api/v1/employees/{$this->employee->public_id}/leaves?per_page=5");

        $response->assertOk()
            ->assertJsonCount(5, 'data')
            ->assertJsonPath('meta.per_page', 5)
            ->assertJsonPath('meta.total', 20)
            ->assertJsonPath('meta.last_page', 4);
    }

    // ── Authorization ─────────────────────────────────────────────────────────

    #[Test]
    public function rejects_unauthenticated_request(): void
    {
        auth()->forgetGuards();

        $response = $this->getJson("/api/v1/employees/{$this->employee->public_id}/leaves");

        $response->assertUnauthorized();
    }

    #[Test]
    public function rejects_user_without_permission(): void
    {
        $unprivilegedUser = User::factory()->create();
        Passport::actingAs($unprivilegedUser);

        $response = $this->getJson("/api/v1/employees/{$this->employee->public_id}/leaves");

        $response->assertForbidden();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function createLeave(Employee $employee, string $typeCode, string $date, LeaveStatus $status = LeaveStatus::APPROVED): Leave
    {
        $leaveType = LeaveType::where('code', $typeCode)->first();

        return Leave::create([
            'employee_id' => $employee->id,
            'leave_type_id' => $leaveType->id,
            'start_date' => $date,
            'end_date' => $date,
            'pay_percentage' => $leaveType->default_pay_percentage,
            'rest_day_factor' => $leaveType->default_rest_day_factor,
            'status' => $status,
            'requested_by' => $this->user->id,
            'approved_by' => $status === LeaveStatus::APPROVED ? $this->user->id : null,
            'approved_at' => $status === LeaveStatus::APPROVED ? now() : null,
        ]);
    }

    private function seedLeaveTypes(): void
    {
        $types = [
            [LeaveType::MEDICAL, 'Incapacidad médica', 'FIXED_PERCENTAGE', 0.00, 'NONE', false],
            [LeaveType::PERSONAL, 'Permiso personal', 'FIXED_PERCENTAGE', 0.00, 'NONE', false],
            [LeaveType::PERMISSION_PAID, 'Permiso con goce de sueldo', 'FIXED_PERCENTAGE', 100.00, 'FULL', true],
            [LeaveType::PERMISSION_HOURS, 'Permiso por horas', 'PROPORTIONAL_HOURS', 0.00, 'PROPORTIONAL', false],
        ];

        foreach ($types as [$code, $name, $mode, $pay, $rest, $bonus]) {
            LeaveType::create([
                'code' => $code,
                'name' => $name,
                'calculation_mode' => $mode,
                'default_pay_percentage' => $pay,
                'default_rest_day_factor' => $rest,
                'counts_for_bonus' => $bonus,
            ]);
        }
    }

    private function makeEmployee(): Employee
    {
        $period = EmploymentPeriod::factory()->create([
            'is_active' => true,
            'start_date' => '2026-01-01',
        ]);

        return $period->employee;
    }
}
