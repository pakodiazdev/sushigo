<?php

namespace Tests\Feature\AttendancePayroll;

use App\Enums\DayStatus;
use App\Enums\VacationRequestStatus;
use App\Models\Attendance;
use App\Models\Employee;
use App\Models\EmploymentPeriod;
use App\Models\User;
use App\Models\VacationEntitlement;
use App\Models\VacationRequest;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class VacationRequestApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    private const DATE = '2026-08-10';

    private const YEAR = 2026;

    protected function setUp(): void
    {
        parent::setUp();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        Permission::create(['name' => 'attendances.create', 'guard_name' => 'api']);
        Permission::create(['name' => 'vacation-requests.request', 'guard_name' => 'api']);
        Permission::create(['name' => 'vacation-requests.approve', 'guard_name' => 'api']);
        Permission::create(['name' => 'vacation-requests.reject', 'guard_name' => 'api']);
        $role = Role::create(['name' => 'manager', 'guard_name' => 'api']);
        $role->givePermissionTo('attendances.create');
        $role->givePermissionTo('vacation-requests.request');
        $role->givePermissionTo('vacation-requests.approve');
        $role->givePermissionTo('vacation-requests.reject');

        Role::firstOrCreate(['name' => 'employee', 'guard_name' => 'api']);
        foreach (Employee::POSITION_ROLES as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);
        }

        $this->user = User::factory()->create();
        $this->user->assignRole('manager');

        Passport::actingAs($this->user);

        Carbon::setTestNow(Carbon::parse(self::DATE.' 10:00:00'));
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    // ══════════════════════════════════════════════════════════════════════════
    // POST /api/v1/vacation-requests — Register Vacation Request
    // ══════════════════════════════════════════════════════════════════════════

    #[Test]
    public function creates_pending_vacation_request_without_attendance_records(): void
    {
        $employee = $this->makeEmployee();
        $this->makeEntitlement($employee, entitledDays: 12, usedDays: 0);

        $response = $this->postJson('/api/v1/vacation-requests', [
            'employee_id' => $employee->public_id,
            'start_date' => self::DATE,
            'end_date' => self::DATE,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.status', VacationRequestStatus::PENDING->value)
            ->assertJsonPath('data.days_count', 1)
            ->assertJsonPath('data.approved_by', null)
            ->assertJsonPath('data.approved_at', null);

        $this->assertDatabaseHas('vacation_requests', [
            'employee_id' => $employee->id,
            'status' => VacationRequestStatus::PENDING->value,
        ]);

        $this->assertDatabaseMissing('attendances', [
            'employee_id' => $employee->id,
            'date' => self::DATE,
        ]);
    }

    #[Test]
    public function creates_multi_day_pending_request_without_attendance(): void
    {
        $employee = $this->makeEmployee();
        $this->makeEntitlement($employee, entitledDays: 12, usedDays: 0);

        $response = $this->postJson('/api/v1/vacation-requests', [
            'employee_id' => $employee->public_id,
            'start_date' => '2026-08-10',
            'end_date' => '2026-08-12',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.status', VacationRequestStatus::PENDING->value)
            ->assertJsonPath('data.days_count', 3);

        foreach (['2026-08-10', '2026-08-11', '2026-08-12'] as $date) {
            $this->assertDatabaseMissing('attendances', [
                'employee_id' => $employee->id,
                'date' => $date,
            ]);
        }
    }

    #[Test]
    public function vacation_request_stores_notes(): void
    {
        $employee = $this->makeEmployee();
        $this->makeEntitlement($employee, entitledDays: 12, usedDays: 0);

        $response = $this->postJson('/api/v1/vacation-requests', [
            'employee_id' => $employee->public_id,
            'start_date' => self::DATE,
            'end_date' => self::DATE,
            'notes' => 'Vacaciones familiares',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.notes', 'Vacaciones familiares');
    }

    #[Test]
    public function vacation_request_rejects_insufficient_balance(): void
    {
        $employee = $this->makeEmployee();
        $this->makeEntitlement($employee, entitledDays: 12, usedDays: 11);

        $response = $this->postJson('/api/v1/vacation-requests', [
            'employee_id' => $employee->public_id,
            'start_date' => '2026-08-10',
            'end_date' => '2026-08-12',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrorFor('start_date');

        $this->assertDatabaseMissing('vacation_requests', [
            'employee_id' => $employee->id,
        ]);
    }

    #[Test]
    public function vacation_request_rejects_when_no_entitlement_for_year(): void
    {
        $employee = $this->makeEmployee();

        $response = $this->postJson('/api/v1/vacation-requests', [
            'employee_id' => $employee->public_id,
            'start_date' => self::DATE,
            'end_date' => self::DATE,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrorFor('employee_id');
    }

    #[Test]
    public function vacation_request_rejects_overlapping_approved_vacation(): void
    {
        $employee = $this->makeEmployee();
        $entitlement = $this->makeEntitlement($employee, entitledDays: 12, usedDays: 0);

        VacationRequest::create([
            'employee_id' => $employee->id,
            'vacation_entitlement_id' => $entitlement->id,
            'start_date' => self::DATE,
            'end_date' => self::DATE,
            'days_count' => 1,
            'status' => VacationRequestStatus::APPROVED,
            'requested_by' => $this->user->id,
            'approved_by' => $this->user->id,
            'approved_at' => now(),
        ]);

        $response = $this->postJson('/api/v1/vacation-requests', [
            'employee_id' => $employee->public_id,
            'start_date' => self::DATE,
            'end_date' => self::DATE,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrorFor('start_date');
    }

    #[Test]
    public function vacation_request_rejects_unauthenticated(): void
    {
        auth()->forgetGuards();

        $this->postJson('/api/v1/vacation-requests', [
            'employee_id' => 'any-id',
            'start_date' => self::DATE,
            'end_date' => self::DATE,
        ])->assertStatus(401);
    }

    #[Test]
    public function vacation_request_rejects_without_permission(): void
    {
        $userWithoutPermission = User::factory()->create();
        Passport::actingAs($userWithoutPermission);

        $this->postJson('/api/v1/vacation-requests', [
            'employee_id' => 'any-id',
            'start_date' => self::DATE,
            'end_date' => self::DATE,
        ])->assertStatus(403);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // PATCH /api/v1/vacation-requests/{id}/approve — Approve Vacation Request
    // ══════════════════════════════════════════════════════════════════════════

    #[Test]
    public function approves_pending_vacation_and_creates_attendance_records(): void
    {
        $employee = $this->makeEmployee();
        $entitlement = $this->makeEntitlement($employee, entitledDays: 12, usedDays: 0);
        $vacationRequest = $this->createPendingVacation($employee, $entitlement, self::DATE, self::DATE, 1);

        $response = $this->patchJson("/api/v1/vacation-requests/{$vacationRequest->public_id}/approve");

        $response->assertOk()
            ->assertJsonPath('data.status', VacationRequestStatus::APPROVED->value)
            ->assertJsonPath('data.approved_at', fn ($v) => $v !== null);

        $this->assertDatabaseHas('vacation_requests', [
            'id' => $vacationRequest->id,
            'status' => VacationRequestStatus::APPROVED->value,
            'approved_by' => $this->user->id,
        ]);

        $this->assertDatabaseHas('attendances', [
            'employee_id' => $employee->id,
            'date' => self::DATE,
            'day_status' => DayStatus::VACATION->value,
        ]);

        $this->assertSame(1, $entitlement->fresh()->used_days);
    }

    #[Test]
    public function approves_multi_day_vacation_creates_attendance_for_each_day(): void
    {
        $employee = $this->makeEmployee();
        $entitlement = $this->makeEntitlement($employee, entitledDays: 12, usedDays: 0);
        $vacationRequest = $this->createPendingVacation($employee, $entitlement, '2026-08-10', '2026-08-12', 3);

        $response = $this->patchJson("/api/v1/vacation-requests/{$vacationRequest->public_id}/approve");

        $response->assertOk()
            ->assertJsonPath('data.status', VacationRequestStatus::APPROVED->value);

        foreach (['2026-08-10', '2026-08-11', '2026-08-12'] as $date) {
            $this->assertDatabaseHas('attendances', [
                'employee_id' => $employee->id,
                'date' => $date,
                'day_status' => DayStatus::VACATION->value,
            ]);
        }

        $this->assertSame(3, $entitlement->fresh()->used_days);
    }

    #[Test]
    public function cannot_approve_already_approved_vacation(): void
    {
        $employee = $this->makeEmployee();
        $entitlement = $this->makeEntitlement($employee, entitledDays: 12, usedDays: 0);
        $vacationRequest = $this->createPendingVacation($employee, $entitlement, self::DATE, self::DATE, 1);

        $this->patchJson("/api/v1/vacation-requests/{$vacationRequest->public_id}/approve")->assertOk();

        $response = $this->patchJson("/api/v1/vacation-requests/{$vacationRequest->public_id}/approve");

        $response->assertStatus(422)
            ->assertJsonValidationErrorFor('status');
    }

    #[Test]
    public function cannot_approve_rejected_vacation(): void
    {
        $employee = $this->makeEmployee();
        $entitlement = $this->makeEntitlement($employee, entitledDays: 12, usedDays: 0);
        $vacationRequest = $this->createPendingVacation($employee, $entitlement, self::DATE, self::DATE, 1);

        $this->patchJson("/api/v1/vacation-requests/{$vacationRequest->public_id}/reject")->assertOk();

        $response = $this->patchJson("/api/v1/vacation-requests/{$vacationRequest->public_id}/approve");

        $response->assertStatus(422)
            ->assertJsonValidationErrorFor('status');
    }

    #[Test]
    public function cannot_approve_if_worked_attendance_exists(): void
    {
        $employee = $this->makeEmployee();
        $entitlement = $this->makeEntitlement($employee, entitledDays: 12, usedDays: 0);
        $vacationRequest = $this->createPendingVacation($employee, $entitlement, self::DATE, self::DATE, 1);

        Attendance::create([
            'employee_id' => $employee->id,
            'date' => self::DATE,
            'day_status' => DayStatus::WORKED,
            'check_in' => now(),
        ]);

        $response = $this->patchJson("/api/v1/vacation-requests/{$vacationRequest->public_id}/approve");

        $response->assertStatus(422)
            ->assertJsonValidationErrorFor('start_date');
    }

    #[Test]
    public function check_in_blocked_after_vacation_approval(): void
    {
        $employee = $this->makeEmployee();
        $entitlement = $this->makeEntitlement($employee, entitledDays: 12, usedDays: 0);
        $vacationRequest = $this->createPendingVacation($employee, $entitlement, self::DATE, self::DATE, 1);

        $this->patchJson("/api/v1/vacation-requests/{$vacationRequest->public_id}/approve")->assertOk();

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

        $this->patchJson('/api/v1/vacation-requests/fake-id/approve')
            ->assertStatus(401);
    }

    #[Test]
    public function approve_rejects_without_permission(): void
    {
        $userWithoutPermission = User::factory()->create();
        Passport::actingAs($userWithoutPermission);

        $this->patchJson('/api/v1/vacation-requests/fake-id/approve')
            ->assertStatus(403);
    }

    #[Test]
    public function approve_returns_404_for_nonexistent_vacation_request(): void
    {
        $this->patchJson('/api/v1/vacation-requests/nonexistent-id/approve')
            ->assertStatus(404);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // PATCH /api/v1/vacation-requests/{id}/reject — Reject Vacation Request
    // ══════════════════════════════════════════════════════════════════════════

    #[Test]
    public function rejects_pending_vacation_without_balance_or_attendance_impact(): void
    {
        $employee = $this->makeEmployee();
        $entitlement = $this->makeEntitlement($employee, entitledDays: 12, usedDays: 0);
        $vacationRequest = $this->createPendingVacation($employee, $entitlement, self::DATE, self::DATE, 1);

        $response = $this->patchJson("/api/v1/vacation-requests/{$vacationRequest->public_id}/reject");

        $response->assertOk()
            ->assertJsonPath('data.status', VacationRequestStatus::REJECTED->value)
            ->assertJsonPath('data.approved_at', fn ($v) => $v !== null);

        $this->assertDatabaseHas('vacation_requests', [
            'id' => $vacationRequest->id,
            'status' => VacationRequestStatus::REJECTED->value,
            'approved_by' => $this->user->id,
        ]);

        $this->assertDatabaseMissing('attendances', [
            'employee_id' => $employee->id,
            'date' => self::DATE,
        ]);

        $this->assertSame(0, $entitlement->fresh()->used_days);
    }

    #[Test]
    public function cannot_reject_already_approved_vacation(): void
    {
        $employee = $this->makeEmployee();
        $entitlement = $this->makeEntitlement($employee, entitledDays: 12, usedDays: 0);
        $vacationRequest = $this->createPendingVacation($employee, $entitlement, self::DATE, self::DATE, 1);

        $this->patchJson("/api/v1/vacation-requests/{$vacationRequest->public_id}/approve")->assertOk();

        $response = $this->patchJson("/api/v1/vacation-requests/{$vacationRequest->public_id}/reject");

        $response->assertStatus(422)
            ->assertJsonValidationErrorFor('status');
    }

    #[Test]
    public function cannot_reject_already_rejected_vacation(): void
    {
        $employee = $this->makeEmployee();
        $entitlement = $this->makeEntitlement($employee, entitledDays: 12, usedDays: 0);
        $vacationRequest = $this->createPendingVacation($employee, $entitlement, self::DATE, self::DATE, 1);

        $this->patchJson("/api/v1/vacation-requests/{$vacationRequest->public_id}/reject")->assertOk();

        $response = $this->patchJson("/api/v1/vacation-requests/{$vacationRequest->public_id}/reject");

        $response->assertStatus(422)
            ->assertJsonValidationErrorFor('status');
    }

    #[Test]
    public function reject_rejects_unauthenticated(): void
    {
        auth()->forgetGuards();

        $this->patchJson('/api/v1/vacation-requests/fake-id/reject')
            ->assertStatus(401);
    }

    #[Test]
    public function reject_rejects_without_permission(): void
    {
        $userWithoutPermission = User::factory()->create();
        Passport::actingAs($userWithoutPermission);

        $this->patchJson('/api/v1/vacation-requests/fake-id/reject')
            ->assertStatus(403);
    }

    #[Test]
    public function reject_returns_404_for_nonexistent_vacation_request(): void
    {
        $this->patchJson('/api/v1/vacation-requests/nonexistent-id/reject')
            ->assertStatus(404);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Full workflow: Request → Approve → Check-in blocked
    // ══════════════════════════════════════════════════════════════════════════

    #[Test]
    public function full_workflow_request_then_approve_then_check_in_blocked(): void
    {
        $employee = $this->makeEmployee();
        $this->makeEntitlement($employee, entitledDays: 12, usedDays: 0);

        $requestResponse = $this->postJson('/api/v1/vacation-requests', [
            'employee_id' => $employee->public_id,
            'start_date' => self::DATE,
            'end_date' => self::DATE,
        ]);

        $requestResponse->assertStatus(201)
            ->assertJsonPath('data.status', 'PENDING');

        $vacationRequestId = $requestResponse->json('data.id');

        $this->assertDatabaseMissing('attendances', [
            'employee_id' => $employee->id,
            'date' => self::DATE,
        ]);

        $approveResponse = $this->patchJson("/api/v1/vacation-requests/{$vacationRequestId}/approve");
        $approveResponse->assertOk()
            ->assertJsonPath('data.status', 'APPROVED');

        $this->assertDatabaseHas('attendances', [
            'employee_id' => $employee->id,
            'date' => self::DATE,
            'day_status' => DayStatus::VACATION->value,
        ]);

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
        $entitlement = $this->makeEntitlement($employee, entitledDays: 12, usedDays: 0);

        $requestResponse = $this->postJson('/api/v1/vacation-requests', [
            'employee_id' => $employee->public_id,
            'start_date' => self::DATE,
            'end_date' => self::DATE,
            'notes' => 'Necesito el día libre',
        ]);

        $requestResponse->assertStatus(201);
        $vacationRequestId = $requestResponse->json('data.id');

        $rejectResponse = $this->patchJson("/api/v1/vacation-requests/{$vacationRequestId}/reject");
        $rejectResponse->assertOk()
            ->assertJsonPath('data.status', 'REJECTED');

        $this->assertDatabaseMissing('attendances', [
            'employee_id' => $employee->id,
            'date' => self::DATE,
        ]);

        $this->assertSame(0, $entitlement->fresh()->used_days);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function makeEmployee(): Employee
    {
        $period = EmploymentPeriod::factory()->create([
            'is_active' => true,
            'start_date' => '2020-01-01',
        ]);

        return $period->employee;
    }

    private function makeEntitlement(Employee $employee, int $entitledDays, int $usedDays = 0): VacationEntitlement
    {
        return VacationEntitlement::create([
            'employee_id' => $employee->id,
            'year' => self::YEAR,
            'entitled_days' => $entitledDays,
            'used_days' => $usedDays,
            'rule_key' => 'VacationsLFTMX',
        ]);
    }

    private function createPendingVacation(
        Employee $employee,
        VacationEntitlement $entitlement,
        string $startDate,
        string $endDate,
        int $daysCount
    ): VacationRequest {
        return VacationRequest::create([
            'employee_id' => $employee->id,
            'vacation_entitlement_id' => $entitlement->id,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'days_count' => $daysCount,
            'status' => VacationRequestStatus::PENDING,
            'requested_by' => $this->user->id,
        ]);
    }
}
