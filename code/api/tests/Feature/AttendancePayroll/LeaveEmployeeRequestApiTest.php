<?php

namespace Tests\Feature\AttendancePayroll;

use App\Enums\DayStatus;
use App\Enums\EmployeeRequestStatus;
use App\Enums\EmployeeRequestType;
use App\Models\Attendance;
use App\Models\Employee;
use App\Models\EmploymentPeriod;
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

class LeaveEmployeeRequestApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $manager;

    private const DATE = '2026-04-15';

    protected function setUp(): void
    {
        parent::setUp();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        Permission::create(['name' => 'employee-requests.view', 'guard_name' => 'api']);
        Permission::create(['name' => 'employee-requests.create', 'guard_name' => 'api']);
        Permission::create(['name' => 'employee-requests.approve', 'guard_name' => 'api']);
        Permission::create(['name' => 'employee-requests.cancel', 'guard_name' => 'api']);

        $managerRole = Role::create(['name' => 'manager', 'guard_name' => 'api']);
        $managerRole->givePermissionTo([
            'employee-requests.view',
            'employee-requests.create',
            'employee-requests.approve',
            'employee-requests.cancel',
        ]);

        Role::firstOrCreate(['name' => 'employee', 'guard_name' => 'api']);
        foreach (Employee::POSITION_ROLES as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);
        }

        $this->manager = User::factory()->create();
        $this->manager->assignRole('manager');

        Passport::actingAs($this->manager);

        $this->seedLeaveTypes();

        Carbon::setTestNow(Carbon::parse(self::DATE.' 10:00:00'));
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Full-day (OPEN_ENDED-equivalent) leave — create → approve
    // ══════════════════════════════════════════════════════════════════════════

    #[Test]
    public function creates_pending_leave_request_without_leave_or_attendance(): void
    {
        $employee = $this->makeEmployee();
        $leaveType = LeaveType::where('code', LeaveType::MEDICAL)->first();

        $response = $this->postJson('/api/v1/employee-requests', [
            'employee_id' => $employee->public_id,
            'type' => EmployeeRequestType::LEAVE->value,
            'payload' => $this->fullDayPayload($leaveType->id),
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.status', EmployeeRequestStatus::PENDING->value)
            ->assertJsonPath('data.requestable', null);

        $this->assertDatabaseMissing('leaves', ['employee_id' => $employee->id]);
        $this->assertDatabaseMissing('attendances', ['employee_id' => $employee->id, 'date' => self::DATE]);
    }

    #[Test]
    public function approves_full_day_leave_request_and_creates_leave_and_attendance(): void
    {
        $employee = $this->makeEmployee();
        $leaveType = LeaveType::where('code', LeaveType::MEDICAL)->first();

        $requestId = $this->createLeaveRequest($employee, $this->fullDayPayload($leaveType->id));

        $response = $this->patchJson("/api/v1/employee-requests/{$requestId}/approve");

        $response->assertOk()
            ->assertJsonPath('data.status', EmployeeRequestStatus::APPROVED->value)
            ->assertJsonPath('data.requestable.type', 'App\\Models\\Leave');

        $this->assertDatabaseHas('leaves', [
            'employee_id' => $employee->id,
            'leave_type_id' => $leaveType->id,
            'status' => 'APPROVED',
            'approved_by' => $this->manager->id,
        ]);

        $this->assertDatabaseHas('attendances', [
            'employee_id' => $employee->id,
            'date' => self::DATE,
            'day_status' => DayStatus::LEAVE->value,
        ]);
    }

    #[Test]
    public function cannot_approve_full_day_leave_if_worked_attendance_exists(): void
    {
        $employee = $this->makeEmployee();
        $leaveType = LeaveType::where('code', LeaveType::MEDICAL)->first();
        $requestId = $this->createLeaveRequest($employee, $this->fullDayPayload($leaveType->id));

        Attendance::create([
            'employee_id' => $employee->id,
            'date' => self::DATE,
            'day_status' => DayStatus::WORKED,
            'check_in' => now(),
        ]);

        $response = $this->patchJson("/api/v1/employee-requests/{$requestId}/approve");

        $response->assertStatus(422)
            ->assertJsonValidationErrorFor('start_date');

        // Approval must roll back — the employee_request stays PENDING.
        $this->assertDatabaseHas('employee_requests', [
            'public_id' => $requestId,
            'status' => EmployeeRequestStatus::PENDING->value,
        ]);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // SCHEDULED partial leave — never touches Attendance
    // ══════════════════════════════════════════════════════════════════════════

    #[Test]
    public function approves_scheduled_partial_leave_without_creating_attendance(): void
    {
        $employee = $this->makeEmployee();
        $leaveType = LeaveType::where('code', LeaveType::PERMISSION_HOURS)->first();
        $requestId = $this->createLeaveRequest($employee, $this->scheduledPayload($leaveType->id));

        $response = $this->patchJson("/api/v1/employee-requests/{$requestId}/approve");

        $response->assertOk()
            ->assertJsonPath('data.status', EmployeeRequestStatus::APPROVED->value);

        $this->assertDatabaseHas('leaves', [
            'employee_id' => $employee->id,
            'leave_type_id' => $leaveType->id,
            'time_mode' => 'SCHEDULED',
            'status' => 'APPROVED',
        ]);

        $this->assertDatabaseMissing('attendances', [
            'employee_id' => $employee->id,
            'date' => self::DATE,
        ]);
    }

    #[Test]
    public function approves_scheduled_partial_leave_even_if_employee_already_checked_in(): void
    {
        $employee = $this->makeEmployee();
        $leaveType = LeaveType::where('code', LeaveType::PERMISSION_HOURS)->first();
        $requestId = $this->createLeaveRequest($employee, $this->scheduledPayload($leaveType->id));

        Attendance::create([
            'employee_id' => $employee->id,
            'date' => self::DATE,
            'day_status' => DayStatus::WORKED,
            'check_in' => now(),
        ]);

        $response = $this->patchJson("/api/v1/employee-requests/{$requestId}/approve");

        $response->assertOk()
            ->assertJsonPath('data.status', EmployeeRequestStatus::APPROVED->value);

        $this->assertDatabaseHas('attendances', [
            'employee_id' => $employee->id,
            'date' => self::DATE,
            'day_status' => DayStatus::WORKED->value,
        ]);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // auto_approve — express flow, no PENDING step
    // ══════════════════════════════════════════════════════════════════════════

    #[Test]
    public function auto_approve_creates_leave_immediately(): void
    {
        $employee = $this->makeEmployee();
        $leaveType = LeaveType::where('code', LeaveType::MEDICAL)->first();

        $response = $this->postJson('/api/v1/employee-requests', [
            'employee_id' => $employee->public_id,
            'type' => EmployeeRequestType::LEAVE->value,
            'auto_approve' => true,
            'payload' => $this->fullDayPayload($leaveType->id),
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.status', EmployeeRequestStatus::APPROVED->value);

        $this->assertDatabaseHas('leaves', [
            'employee_id' => $employee->id,
            'status' => 'APPROVED',
        ]);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Reject
    // ══════════════════════════════════════════════════════════════════════════

    #[Test]
    public function rejects_pending_leave_request_with_optional_reason(): void
    {
        $employee = $this->makeEmployee();
        $leaveType = LeaveType::where('code', LeaveType::MEDICAL)->first();
        $requestId = $this->createLeaveRequest($employee, $this->fullDayPayload($leaveType->id));

        $response = $this->patchJson("/api/v1/employee-requests/{$requestId}/reject", [
            'reason' => 'No hay cobertura suficiente ese día',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.status', EmployeeRequestStatus::REJECTED->value)
            ->assertJsonPath('data.rejection_reason', 'No hay cobertura suficiente ese día');

        $this->assertDatabaseMissing('leaves', ['employee_id' => $employee->id]);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Cancel
    // ══════════════════════════════════════════════════════════════════════════

    #[Test]
    public function cancels_an_approved_leave_request_and_deletes_the_leave(): void
    {
        $employee = $this->makeEmployee();
        $leaveType = LeaveType::where('code', LeaveType::MEDICAL)->first();
        $requestId = $this->createLeaveRequest($employee, $this->fullDayPayload($leaveType->id));

        $this->patchJson("/api/v1/employee-requests/{$requestId}/approve")->assertOk();

        $this->assertDatabaseHas('leaves', [
            'employee_id' => $employee->id,
            'status' => 'APPROVED',
        ]);

        $cancelResponse = $this->patchJson("/api/v1/employee-requests/{$requestId}/cancel");

        $cancelResponse->assertOk()
            ->assertJsonPath('data.status', EmployeeRequestStatus::CANCELLED->value)
            ->assertJsonPath('data.requestable', null);

        $this->assertDatabaseMissing('leaves', [
            'employee_id' => $employee->id,
        ]);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Guards / validation
    // ══════════════════════════════════════════════════════════════════════════

    #[Test]
    public function cannot_approve_already_approved_leave_request(): void
    {
        $employee = $this->makeEmployee();
        $leaveType = LeaveType::where('code', LeaveType::MEDICAL)->first();
        $requestId = $this->createLeaveRequest($employee, $this->fullDayPayload($leaveType->id));

        $this->patchJson("/api/v1/employee-requests/{$requestId}/approve")->assertOk();

        $response = $this->patchJson("/api/v1/employee-requests/{$requestId}/approve");

        $response->assertStatus(422)
            ->assertJsonValidationErrorFor('status');
    }

    #[Test]
    public function rejects_leave_type_without_required_payload_fields(): void
    {
        $employee = $this->makeEmployee();

        $response = $this->postJson('/api/v1/employee-requests', [
            'employee_id' => $employee->public_id,
            'type' => EmployeeRequestType::LEAVE->value,
            'payload' => [],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['payload.leave_type_id', 'payload.start_date', 'payload.end_date']);
    }

    #[Test]
    public function rejects_proportional_hours_leave_without_time_mode(): void
    {
        $employee = $this->makeEmployee();
        $leaveType = LeaveType::where('code', LeaveType::PERMISSION_HOURS)->first();

        $response = $this->postJson('/api/v1/employee-requests', [
            'employee_id' => $employee->public_id,
            'type' => EmployeeRequestType::LEAVE->value,
            'payload' => [
                'leave_type_id' => $leaveType->id,
                'start_date' => self::DATE,
                'end_date' => self::DATE,
            ],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrorFor('payload.time_mode');
    }

    #[Test]
    public function create_rejects_unauthenticated(): void
    {
        auth()->forgetGuards();

        $this->postJson('/api/v1/employee-requests', [
            'employee_id' => 'any-id',
            'type' => EmployeeRequestType::LEAVE->value,
            'payload' => [],
        ])->assertStatus(401);
    }

    #[Test]
    public function create_rejects_without_employee_requests_create_permission(): void
    {
        $userWithoutPermission = User::factory()->create();
        Passport::actingAs($userWithoutPermission);

        $this->postJson('/api/v1/employee-requests', [
            'employee_id' => 'any-id',
            'type' => EmployeeRequestType::LEAVE->value,
            'payload' => [],
        ])->assertStatus(403);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

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

    private function fullDayPayload(int $leaveTypeId): array
    {
        return [
            'leave_type_id' => $leaveTypeId,
            'start_date' => self::DATE,
            'end_date' => self::DATE,
        ];
    }

    private function scheduledPayload(int $leaveTypeId): array
    {
        return [
            'leave_type_id' => $leaveTypeId,
            'start_date' => self::DATE,
            'end_date' => self::DATE,
            'time_mode' => 'SCHEDULED',
            'scheduled_start_time' => '14:00',
            'scheduled_end_time' => '16:00',
        ];
    }

    private function createLeaveRequest(Employee $employee, array $payload): string
    {
        $response = $this->postJson('/api/v1/employee-requests', [
            'employee_id' => $employee->public_id,
            'type' => EmployeeRequestType::LEAVE->value,
            'payload' => $payload,
        ]);

        return $response->json('data.id');
    }
}
