<?php

namespace Tests\Feature\AttendancePayroll;

use App\Enums\DayStatus;
use App\Enums\LeaveStatus;
use App\Models\Attendance;
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

class LeaveRequestApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    private const DATE = '2026-04-15';

    protected function setUp(): void
    {
        parent::setUp();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        Permission::create(['name' => 'attendances.create', 'guard_name' => 'api']);
        Permission::create(['name' => 'leaves.request', 'guard_name' => 'api']);
        Permission::create(['name' => 'leaves.approve', 'guard_name' => 'api']);
        Permission::create(['name' => 'leaves.reject', 'guard_name' => 'api']);
        $role = Role::create(['name' => 'manager', 'guard_name' => 'api']);
        $role->givePermissionTo('attendances.create');
        $role->givePermissionTo('leaves.request');
        $role->givePermissionTo('leaves.approve');
        $role->givePermissionTo('leaves.reject');

        Role::firstOrCreate(['name' => 'employee', 'guard_name' => 'api']);
        foreach (Employee::POSITION_ROLES as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);
        }

        $this->user = User::factory()->create();
        $this->user->assignRole('manager');

        Passport::actingAs($this->user);

        $this->seedLeaveTypes();

        Carbon::setTestNow(Carbon::parse(self::DATE.' 10:00:00'));
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    // ══════════════════════════════════════════════════════════════════════════
    // POST /api/v1/leaves/requests — Register Leave Request
    // ══════════════════════════════════════════════════════════════════════════

    #[Test]
    public function creates_pending_leave_request_without_attendance_records(): void
    {
        $employee = $this->makeEmployee();
        $leaveType = LeaveType::where('code', LeaveType::MEDICAL)->first();

        $response = $this->postJson('/api/v1/leaves/requests', [
            'employee_id' => $employee->public_id,
            'leave_type_id' => $leaveType->id,
            'start_date' => self::DATE,
            'end_date' => self::DATE,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.status', LeaveStatus::PENDING->value)
            ->assertJsonPath('data.approved_by', null)
            ->assertJsonPath('data.approved_at', null);

        $this->assertDatabaseHas('leaves', [
            'employee_id' => $employee->id,
            'status' => LeaveStatus::PENDING->value,
        ]);

        // No attendance records should be created for a PENDING request
        $this->assertDatabaseMissing('attendances', [
            'employee_id' => $employee->id,
            'date' => self::DATE,
        ]);
    }

    #[Test]
    public function creates_multi_day_pending_request_without_attendance(): void
    {
        $employee = $this->makeEmployee();
        $leaveType = LeaveType::where('code', LeaveType::MEDICAL)->first();

        $response = $this->postJson('/api/v1/leaves/requests', [
            'employee_id' => $employee->public_id,
            'leave_type_id' => $leaveType->id,
            'start_date' => '2026-04-15',
            'end_date' => '2026-04-17',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.status', LeaveStatus::PENDING->value);

        foreach (['2026-04-15', '2026-04-16', '2026-04-17'] as $date) {
            $this->assertDatabaseMissing('attendances', [
                'employee_id' => $employee->id,
                'date' => $date,
            ]);
        }
    }

    #[Test]
    public function leave_request_stores_notes_and_pay_percentage(): void
    {
        $employee = $this->makeEmployee();
        $leaveType = LeaveType::where('code', LeaveType::PERSONAL)->first();

        $response = $this->postJson('/api/v1/leaves/requests', [
            'employee_id' => $employee->public_id,
            'leave_type_id' => $leaveType->id,
            'start_date' => self::DATE,
            'end_date' => self::DATE,
            'pay_percentage' => 50.00,
            'notes' => 'Cita médica programada',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.resolved_pay_percentage', 50)
            ->assertJsonPath('data.notes', 'Cita médica programada');
    }

    #[Test]
    public function leave_request_rejects_overlapping_approved_leave(): void
    {
        $employee = $this->makeEmployee();
        $leaveType = LeaveType::where('code', LeaveType::MEDICAL)->first();

        Leave::create([
            'employee_id' => $employee->id,
            'leave_type_id' => $leaveType->id,
            'start_date' => self::DATE,
            'end_date' => self::DATE,
            'status' => LeaveStatus::APPROVED,
            'requested_by' => $this->user->id,
            'approved_by' => $this->user->id,
            'approved_at' => now(),
        ]);

        $response = $this->postJson('/api/v1/leaves/requests', [
            'employee_id' => $employee->public_id,
            'leave_type_id' => $leaveType->id,
            'start_date' => self::DATE,
            'end_date' => self::DATE,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrorFor('start_date');
    }

    #[Test]
    public function leave_request_rejects_unauthenticated(): void
    {
        auth()->forgetGuards();

        $this->postJson('/api/v1/leaves/requests', [
            'employee_id' => 'any-id',
            'leave_type_id' => 1,
            'start_date' => self::DATE,
            'end_date' => self::DATE,
        ])->assertStatus(401);
    }

    #[Test]
    public function leave_request_rejects_without_leaves_request_permission(): void
    {
        $userWithoutPermission = User::factory()->create();
        Passport::actingAs($userWithoutPermission);

        $this->postJson('/api/v1/leaves/requests', [
            'employee_id' => 'any-id',
            'leave_type_id' => 1,
            'start_date' => self::DATE,
            'end_date' => self::DATE,
        ])->assertStatus(403);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // PATCH /api/v1/leaves/{id}/approve — Approve Leave
    // ══════════════════════════════════════════════════════════════════════════

    #[Test]
    public function approves_pending_leave_and_creates_attendance_records(): void
    {
        $employee = $this->makeEmployee();
        $leave = $this->createPendingLeave($employee, self::DATE, self::DATE);

        $response = $this->patchJson("/api/v1/leaves/{$leave->public_id}/approve");

        $response->assertOk()
            ->assertJsonPath('data.status', LeaveStatus::APPROVED->value)
            ->assertJsonPath('data.approved_at', fn ($v) => $v !== null);

        $this->assertDatabaseHas('leaves', [
            'id' => $leave->id,
            'status' => LeaveStatus::APPROVED->value,
            'approved_by' => $this->user->id,
        ]);

        $this->assertDatabaseHas('attendances', [
            'employee_id' => $employee->id,
            'date' => self::DATE,
            'day_status' => DayStatus::LEAVE->value,
        ]);
    }

    #[Test]
    public function approves_multi_day_leave_creates_attendance_for_each_day(): void
    {
        $employee = $this->makeEmployee();
        $leave = $this->createPendingLeave($employee, '2026-04-15', '2026-04-17');

        $response = $this->patchJson("/api/v1/leaves/{$leave->public_id}/approve");

        $response->assertOk()
            ->assertJsonPath('data.status', LeaveStatus::APPROVED->value);

        foreach (['2026-04-15', '2026-04-16', '2026-04-17'] as $date) {
            $this->assertDatabaseHas('attendances', [
                'employee_id' => $employee->id,
                'date' => $date,
                'day_status' => DayStatus::LEAVE->value,
            ]);
        }
    }

    #[Test]
    public function cannot_approve_already_approved_leave(): void
    {
        $employee = $this->makeEmployee();
        $leave = $this->createPendingLeave($employee, self::DATE, self::DATE);

        // First approval
        $this->patchJson("/api/v1/leaves/{$leave->public_id}/approve")
            ->assertOk();

        // Second approval attempt
        $response = $this->patchJson("/api/v1/leaves/{$leave->public_id}/approve");

        $response->assertStatus(422)
            ->assertJsonValidationErrorFor('status');
    }

    #[Test]
    public function cannot_approve_rejected_leave(): void
    {
        $employee = $this->makeEmployee();
        $leave = $this->createPendingLeave($employee, self::DATE, self::DATE);

        // Reject first
        $this->patchJson("/api/v1/leaves/{$leave->public_id}/reject")->assertOk();

        // Attempt to approve
        $response = $this->patchJson("/api/v1/leaves/{$leave->public_id}/approve");

        $response->assertStatus(422)
            ->assertJsonValidationErrorFor('status');
    }

    #[Test]
    public function cannot_approve_if_worked_attendance_exists(): void
    {
        $employee = $this->makeEmployee();
        $leave = $this->createPendingLeave($employee, self::DATE, self::DATE);

        // Create a worked attendance record
        Attendance::create([
            'employee_id' => $employee->id,
            'date' => self::DATE,
            'day_status' => DayStatus::WORKED,
            'check_in' => now(),
        ]);

        $response = $this->patchJson("/api/v1/leaves/{$leave->public_id}/approve");

        $response->assertStatus(422)
            ->assertJsonValidationErrorFor('start_date');
    }

    #[Test]
    public function check_in_blocked_after_leave_approval(): void
    {
        $employee = $this->makeEmployee();
        $leave = $this->createPendingLeave($employee, self::DATE, self::DATE);

        // Approve
        $this->patchJson("/api/v1/leaves/{$leave->public_id}/approve")->assertOk();

        // Attempt check-in on the same day
        $response = $this->postJson('/api/v1/attendances/check-in', [
            'employee_id' => $employee->public_id,
            'check_in' => self::DATE.'T09:00:00-06:00',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrorFor('check_in');
    }

    #[Test]
    public function approve_rejects_unauthenticated(): void
    {
        auth()->forgetGuards();

        $this->patchJson('/api/v1/leaves/fake-id/approve')
            ->assertStatus(401);
    }

    #[Test]
    public function approve_rejects_without_leaves_approve_permission(): void
    {
        $userWithoutPermission = User::factory()->create();
        Passport::actingAs($userWithoutPermission);

        $this->patchJson('/api/v1/leaves/fake-id/approve')
            ->assertStatus(403);
    }

    #[Test]
    public function approve_returns_404_for_nonexistent_leave(): void
    {
        $this->patchJson('/api/v1/leaves/nonexistent-id/approve')
            ->assertStatus(404);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // PATCH /api/v1/leaves/{id}/reject — Reject Leave
    // ══════════════════════════════════════════════════════════════════════════

    #[Test]
    public function rejects_pending_leave_without_attendance_impact(): void
    {
        $employee = $this->makeEmployee();
        $leave = $this->createPendingLeave($employee, self::DATE, self::DATE);

        $response = $this->patchJson("/api/v1/leaves/{$leave->public_id}/reject");

        $response->assertOk()
            ->assertJsonPath('data.status', LeaveStatus::REJECTED->value)
            ->assertJsonPath('data.approved_at', fn ($v) => $v !== null);

        $this->assertDatabaseHas('leaves', [
            'id' => $leave->id,
            'status' => LeaveStatus::REJECTED->value,
            'approved_by' => $this->user->id,
        ]);

        // No attendance records should be created
        $this->assertDatabaseMissing('attendances', [
            'employee_id' => $employee->id,
            'date' => self::DATE,
        ]);
    }

    #[Test]
    public function cannot_reject_already_approved_leave(): void
    {
        $employee = $this->makeEmployee();
        $leave = $this->createPendingLeave($employee, self::DATE, self::DATE);

        // Approve first
        $this->patchJson("/api/v1/leaves/{$leave->public_id}/approve")->assertOk();

        // Attempt to reject
        $response = $this->patchJson("/api/v1/leaves/{$leave->public_id}/reject");

        $response->assertStatus(422)
            ->assertJsonValidationErrorFor('status');
    }

    #[Test]
    public function cannot_reject_already_rejected_leave(): void
    {
        $employee = $this->makeEmployee();
        $leave = $this->createPendingLeave($employee, self::DATE, self::DATE);

        // First rejection
        $this->patchJson("/api/v1/leaves/{$leave->public_id}/reject")->assertOk();

        // Second rejection attempt
        $response = $this->patchJson("/api/v1/leaves/{$leave->public_id}/reject");

        $response->assertStatus(422)
            ->assertJsonValidationErrorFor('status');
    }

    #[Test]
    public function reject_rejects_unauthenticated(): void
    {
        auth()->forgetGuards();

        $this->patchJson('/api/v1/leaves/fake-id/reject')
            ->assertStatus(401);
    }

    #[Test]
    public function reject_rejects_without_leaves_reject_permission(): void
    {
        $userWithoutPermission = User::factory()->create();
        Passport::actingAs($userWithoutPermission);

        $this->patchJson('/api/v1/leaves/fake-id/reject')
            ->assertStatus(403);
    }

    #[Test]
    public function reject_returns_404_for_nonexistent_leave(): void
    {
        $this->patchJson('/api/v1/leaves/nonexistent-id/reject')
            ->assertStatus(404);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Full workflow: Request → Approve → Check-in blocked
    // ══════════════════════════════════════════════════════════════════════════

    #[Test]
    public function full_workflow_request_then_approve_then_check_in_blocked(): void
    {
        $employee = $this->makeEmployee();
        $leaveType = LeaveType::where('code', LeaveType::MEDICAL)->first();

        // Step 1: Create leave request
        $requestResponse = $this->postJson('/api/v1/leaves/requests', [
            'employee_id' => $employee->public_id,
            'leave_type_id' => $leaveType->id,
            'start_date' => self::DATE,
            'end_date' => self::DATE,
        ]);

        $requestResponse->assertStatus(201)
            ->assertJsonPath('data.status', 'PENDING');

        $leaveId = $requestResponse->json('data.id');

        // No attendance
        $this->assertDatabaseMissing('attendances', [
            'employee_id' => $employee->id,
            'date' => self::DATE,
        ]);

        // Step 2: Approve
        $approveResponse = $this->patchJson("/api/v1/leaves/{$leaveId}/approve");
        $approveResponse->assertOk()
            ->assertJsonPath('data.status', 'APPROVED');

        // Attendance created
        $this->assertDatabaseHas('attendances', [
            'employee_id' => $employee->id,
            'date' => self::DATE,
            'day_status' => DayStatus::LEAVE->value,
        ]);

        // Step 3: Check-in blocked
        $checkInResponse = $this->postJson('/api/v1/attendances/check-in', [
            'employee_id' => $employee->public_id,
            'check_in' => self::DATE.'T09:00:00-06:00',
        ]);

        $checkInResponse->assertStatus(422);
    }

    #[Test]
    public function full_workflow_request_then_reject_no_attendance(): void
    {
        $employee = $this->makeEmployee();
        $leaveType = LeaveType::where('code', LeaveType::PERSONAL)->first();

        // Step 1: Create leave request
        $requestResponse = $this->postJson('/api/v1/leaves/requests', [
            'employee_id' => $employee->public_id,
            'leave_type_id' => $leaveType->id,
            'start_date' => self::DATE,
            'end_date' => self::DATE,
            'notes' => 'Necesito el día libre',
        ]);

        $requestResponse->assertStatus(201);
        $leaveId = $requestResponse->json('data.id');

        // Step 2: Reject
        $rejectResponse = $this->patchJson("/api/v1/leaves/{$leaveId}/reject");
        $rejectResponse->assertOk()
            ->assertJsonPath('data.status', 'REJECTED');

        // No attendance records
        $this->assertDatabaseMissing('attendances', [
            'employee_id' => $employee->id,
            'date' => self::DATE,
        ]);
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

    private function createPendingLeave(Employee $employee, string $startDate, string $endDate): Leave
    {
        $leaveType = LeaveType::where('code', LeaveType::MEDICAL)->first();

        return Leave::create([
            'employee_id' => $employee->id,
            'leave_type_id' => $leaveType->id,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'status' => LeaveStatus::PENDING,
            'requested_by' => $this->user->id,
        ]);
    }
}
