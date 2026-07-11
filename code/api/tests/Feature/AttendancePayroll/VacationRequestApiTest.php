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

    protected User $schedulerWithoutApprove;

    protected User $employeeUser;

    private const DATE = '2026-08-10';

    private const YEAR = 2026;

    protected function setUp(): void
    {
        parent::setUp();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        Permission::create(['name' => 'attendances.create', 'guard_name' => 'api']);
        Permission::create(['name' => 'vacation-requests.schedule', 'guard_name' => 'api']);
        Permission::create(['name' => 'vacation-requests.approve', 'guard_name' => 'api']);
        Permission::create(['name' => 'vacation-requests.reject', 'guard_name' => 'api']);
        Permission::create(['name' => 'employee-requests.create', 'guard_name' => 'api']);

        // admin-like role: can directly schedule vacations on behalf of an employee
        // AND approve — the endpoint auto-approves for this role, per real seeder config.
        $role = Role::create(['name' => 'admin', 'guard_name' => 'api']);
        $role->givePermissionTo('attendances.create');
        $role->givePermissionTo('vacation-requests.schedule');
        $role->givePermissionTo('vacation-requests.approve');
        $role->givePermissionTo('vacation-requests.reject');

        // Hypothetical role: can reach the direct endpoint but not approve — exercises
        // the $autoApprove=false branch. No real seeded role holds schedule without
        // approve today, but the action must still support it correctly.
        $schedulerRole = Role::create(['name' => 'scheduler-without-approve', 'guard_name' => 'api']);
        $schedulerRole->givePermissionTo('vacation-requests.schedule');

        // Regular self-service employee: no vacation-requests.schedule at all — they
        // request their own vacation via POST /employee-requests instead, and must be
        // rejected if they try to hit the direct-registration endpoint.
        $employeeRole = Role::firstOrCreate(['name' => 'employee', 'guard_name' => 'api']);
        $employeeRole->givePermissionTo('employee-requests.create');

        foreach (Employee::POSITION_ROLES as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);
        }

        $this->user = User::factory()->create();
        $this->user->assignRole('admin');

        $this->schedulerWithoutApprove = User::factory()->create();
        $this->schedulerWithoutApprove->assignRole('scheduler-without-approve');

        $this->employeeUser = User::factory()->create();
        $this->employeeUser->assignRole('employee');

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
    public function stays_pending_when_scheduler_lacks_approve_permission(): void
    {
        Passport::actingAs($this->schedulerWithoutApprove);

        $employee = $this->makeEmployee();
        $this->makeEntitlement($employee, entitledDays: 12, usedDays: 0);

        $response = $this->postJson('/api/v1/vacation-requests', [
            'employee_id' => $employee->public_id,
            'dates' => [self::DATE],
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.status', VacationRequestStatus::PENDING->value)
            ->assertJsonPath('data.days_count', 1)
            ->assertJsonPath('data.dates', [self::DATE])
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
    public function multi_day_request_stays_pending_when_scheduler_lacks_approve_permission(): void
    {
        Passport::actingAs($this->schedulerWithoutApprove);

        $employee = $this->makeEmployee();
        $this->makeEntitlement($employee, entitledDays: 12, usedDays: 0);

        $response = $this->postJson('/api/v1/vacation-requests', [
            'employee_id' => $employee->public_id,
            'dates' => ['2026-08-10', '2026-08-11', '2026-08-12'],
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
    public function non_contiguous_request_stays_pending_when_scheduler_lacks_approve_permission(): void
    {
        Passport::actingAs($this->schedulerWithoutApprove);

        $employee = $this->makeEmployee();
        $this->makeEntitlement($employee, entitledDays: 12, usedDays: 0);

        $response = $this->postJson('/api/v1/vacation-requests', [
            'employee_id' => $employee->public_id,
            'dates' => ['2026-08-10', '2026-08-12'],
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.status', VacationRequestStatus::PENDING->value)
            ->assertJsonPath('data.days_count', 2)
            ->assertJsonPath('data.start_date', '2026-08-10')
            ->assertJsonPath('data.end_date', '2026-08-12')
            ->assertJsonPath('data.dates', ['2026-08-10', '2026-08-12']);

        $vacationRequest = VacationRequest::first();
        $this->assertDatabaseHas('vacation_request_dates', [
            'vacation_request_id' => $vacationRequest->id,
            'date' => '2026-08-10',
        ]);
        $this->assertDatabaseHas('vacation_request_dates', [
            'vacation_request_id' => $vacationRequest->id,
            'date' => '2026-08-12',
        ]);
        $this->assertDatabaseMissing('vacation_request_dates', [
            'vacation_request_id' => $vacationRequest->id,
            'date' => '2026-08-11',
        ]);
    }

    #[Test]
    public function admin_registering_on_behalf_auto_approves_immediately(): void
    {
        $employee = $this->makeEmployee();
        $entitlement = $this->makeEntitlement($employee, entitledDays: 12, usedDays: 0);

        $response = $this->postJson('/api/v1/vacation-requests', [
            'employee_id' => $employee->public_id,
            'dates' => [self::DATE],
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.status', VacationRequestStatus::APPROVED->value)
            ->assertJsonPath('data.approved_by', $this->user->name)
            ->assertJsonPath('data.approved_at', fn ($v) => $v !== null);

        $this->assertDatabaseHas('attendances', [
            'employee_id' => $employee->id,
            'date' => self::DATE,
            'day_status' => DayStatus::VACATION->value,
        ]);

        $this->assertSame(1, $entitlement->fresh()->used_days);
    }

    #[Test]
    public function admin_registering_multi_day_on_behalf_auto_approves_every_day(): void
    {
        $employee = $this->makeEmployee();
        $entitlement = $this->makeEntitlement($employee, entitledDays: 12, usedDays: 0);

        $response = $this->postJson('/api/v1/vacation-requests', [
            'employee_id' => $employee->public_id,
            'dates' => ['2026-08-10', '2026-08-11', '2026-08-12'],
        ]);

        $response->assertStatus(201)
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
    public function admin_registering_on_behalf_rejects_when_worked_attendance_exists(): void
    {
        $employee = $this->makeEmployee();
        $entitlement = $this->makeEntitlement($employee, entitledDays: 12, usedDays: 0);

        Attendance::create([
            'employee_id' => $employee->id,
            'date' => self::DATE,
            'day_status' => DayStatus::WORKED,
            'check_in' => now(),
        ]);

        $response = $this->postJson('/api/v1/vacation-requests', [
            'employee_id' => $employee->public_id,
            'dates' => [self::DATE],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrorFor('dates');

        $this->assertSame(0, $entitlement->fresh()->used_days);
    }

    #[Test]
    public function approving_non_contiguous_days_only_marks_selected_days_as_vacation(): void
    {
        $employee = $this->makeEmployee();
        $entitlement = $this->makeEntitlement($employee, entitledDays: 12, usedDays: 0);
        $vacationRequest = $this->createPendingVacation($employee, $entitlement, ['2026-08-10', '2026-08-12']);

        $response = $this->patchJson("/api/v1/vacation-requests/{$vacationRequest->public_id}/approve");

        $response->assertOk();

        $this->assertDatabaseHas('attendances', [
            'employee_id' => $employee->id,
            'date' => '2026-08-10',
            'day_status' => DayStatus::VACATION->value,
        ]);
        $this->assertDatabaseHas('attendances', [
            'employee_id' => $employee->id,
            'date' => '2026-08-12',
            'day_status' => DayStatus::VACATION->value,
        ]);
        $this->assertDatabaseMissing('attendances', [
            'employee_id' => $employee->id,
            'date' => '2026-08-11',
        ]);
    }

    #[Test]
    public function vacation_request_stores_notes(): void
    {
        $employee = $this->makeEmployee();
        $this->makeEntitlement($employee, entitledDays: 12, usedDays: 0);

        $response = $this->postJson('/api/v1/vacation-requests', [
            'employee_id' => $employee->public_id,
            'dates' => [self::DATE],
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
            'dates' => ['2026-08-10', '2026-08-11', '2026-08-12'],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrorFor('dates');

        $this->assertDatabaseMissing('vacation_requests', [
            'employee_id' => $employee->id,
        ]);
    }

    #[Test]
    public function vacation_request_rejects_when_employee_has_not_completed_a_full_year(): void
    {
        // Hired one month before self::DATE — zero completed seniority years, so no
        // anniversary has been reached yet and no entitlement can be generated.
        $employee = $this->employeeStartedOn(Carbon::parse(self::DATE)->subMonth()->toDateString());

        $response = $this->postJson('/api/v1/vacation-requests', [
            'employee_id' => $employee->public_id,
            'dates' => [self::DATE],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrorFor('employee_id');
    }

    #[Test]
    public function resolves_entitlement_by_anniversary_window_not_calendar_year_of_the_request(): void
    {
        // Anniversary reached Sep 2025 (seniority year 1, entitlement tagged year=2025) —
        // that entitlement stays the active one through Aug 2026 (the day before the
        // 2026 anniversary), even though the requested date's calendar year (2026)
        // differs from the entitlement's own calendar year (2025). Also verifies the
        // entitlement is generated on demand — nobody visited the Vacaciones section first.
        $employee = $this->employeeStartedOn('2024-09-01');
        $this->assertDatabaseCount('vacation_entitlements', 0);

        $response = $this->postJson('/api/v1/vacation-requests', [
            'employee_id' => $employee->public_id,
            'dates' => [self::DATE],
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.status', VacationRequestStatus::APPROVED->value);

        $this->assertDatabaseHas('vacation_entitlements', [
            'employee_id' => $employee->id,
            'year' => 2025,
        ]);
    }

    #[Test]
    public function vacation_request_rejects_duplicate_dates(): void
    {
        $employee = $this->makeEmployee();
        $this->makeEntitlement($employee, entitledDays: 12, usedDays: 0);

        $response = $this->postJson('/api/v1/vacation-requests', [
            'employee_id' => $employee->public_id,
            'dates' => [self::DATE, self::DATE],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrorFor('dates.0');
    }

    #[Test]
    public function vacation_request_rejects_empty_dates(): void
    {
        $employee = $this->makeEmployee();
        $this->makeEntitlement($employee, entitledDays: 12, usedDays: 0);

        $response = $this->postJson('/api/v1/vacation-requests', [
            'employee_id' => $employee->public_id,
            'dates' => [],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrorFor('dates');
    }

    #[Test]
    public function vacation_request_rejects_overlapping_approved_vacation(): void
    {
        $employee = $this->makeEmployee();
        $entitlement = $this->makeEntitlement($employee, entitledDays: 12, usedDays: 0);

        $this->createApprovedVacation($employee, $entitlement, [self::DATE]);

        $response = $this->postJson('/api/v1/vacation-requests', [
            'employee_id' => $employee->public_id,
            'dates' => [self::DATE],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrorFor('dates');
    }

    #[Test]
    public function vacation_request_rejects_unauthenticated(): void
    {
        auth()->forgetGuards();

        $this->postJson('/api/v1/vacation-requests', [
            'employee_id' => 'any-id',
            'dates' => [self::DATE],
        ])->assertStatus(401);
    }

    #[Test]
    public function vacation_request_rejects_without_permission(): void
    {
        $userWithoutPermission = User::factory()->create();
        Passport::actingAs($userWithoutPermission);

        $this->postJson('/api/v1/vacation-requests', [
            'employee_id' => 'any-id',
            'dates' => [self::DATE],
        ])->assertStatus(403);
    }

    #[Test]
    public function self_service_employee_cannot_hit_the_direct_registration_endpoint(): void
    {
        // A regular self-service employee (employee-requests.create only, no
        // vacation-requests.schedule) must request their own vacation through
        // POST /employee-requests — this direct endpoint stays admin-only.
        Passport::actingAs($this->employeeUser);

        $this->postJson('/api/v1/vacation-requests', [
            'employee_id' => 'any-id',
            'dates' => [self::DATE],
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
        $vacationRequest = $this->createPendingVacation($employee, $entitlement, [self::DATE]);

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
        $vacationRequest = $this->createPendingVacation($employee, $entitlement, ['2026-08-10', '2026-08-11', '2026-08-12']);

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
        $vacationRequest = $this->createPendingVacation($employee, $entitlement, [self::DATE]);

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
        $vacationRequest = $this->createPendingVacation($employee, $entitlement, [self::DATE]);

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
        $vacationRequest = $this->createPendingVacation($employee, $entitlement, [self::DATE]);

        Attendance::create([
            'employee_id' => $employee->id,
            'date' => self::DATE,
            'day_status' => DayStatus::WORKED,
            'check_in' => now(),
        ]);

        $response = $this->patchJson("/api/v1/vacation-requests/{$vacationRequest->public_id}/approve");

        $response->assertStatus(422)
            ->assertJsonValidationErrorFor('dates');
    }

    #[Test]
    public function check_in_blocked_after_vacation_approval(): void
    {
        $employee = $this->makeEmployee();
        $entitlement = $this->makeEntitlement($employee, entitledDays: 12, usedDays: 0);
        $vacationRequest = $this->createPendingVacation($employee, $entitlement, [self::DATE]);

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
        $vacationRequest = $this->createPendingVacation($employee, $entitlement, [self::DATE]);

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
        $vacationRequest = $this->createPendingVacation($employee, $entitlement, [self::DATE]);

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
        $vacationRequest = $this->createPendingVacation($employee, $entitlement, [self::DATE]);

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
    public function full_workflow_scheduler_without_approve_then_admin_approves_then_check_in_blocked(): void
    {
        $employee = $this->makeEmployee();
        $this->makeEntitlement($employee, entitledDays: 12, usedDays: 0);

        Passport::actingAs($this->schedulerWithoutApprove);

        $requestResponse = $this->postJson('/api/v1/vacation-requests', [
            'employee_id' => $employee->public_id,
            'dates' => [self::DATE],
        ]);

        $requestResponse->assertStatus(201)
            ->assertJsonPath('data.status', 'PENDING');

        $vacationRequestId = $requestResponse->json('data.id');

        $this->assertDatabaseMissing('attendances', [
            'employee_id' => $employee->id,
            'date' => self::DATE,
        ]);

        Passport::actingAs($this->user);

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
    public function full_workflow_scheduler_without_approve_then_admin_rejects_no_attendance(): void
    {
        $employee = $this->makeEmployee();
        $entitlement = $this->makeEntitlement($employee, entitledDays: 12, usedDays: 0);

        Passport::actingAs($this->schedulerWithoutApprove);

        $requestResponse = $this->postJson('/api/v1/vacation-requests', [
            'employee_id' => $employee->public_id,
            'dates' => [self::DATE],
            'notes' => 'Necesito el día libre',
        ]);

        $requestResponse->assertStatus(201)
            ->assertJsonPath('data.status', 'PENDING');
        $vacationRequestId = $requestResponse->json('data.id');

        Passport::actingAs($this->user);

        $rejectResponse = $this->patchJson("/api/v1/vacation-requests/{$vacationRequestId}/reject");
        $rejectResponse->assertOk()
            ->assertJsonPath('data.status', 'REJECTED');

        $this->assertDatabaseMissing('attendances', [
            'employee_id' => $employee->id,
            'date' => self::DATE,
        ]);

        $this->assertSame(0, $entitlement->fresh()->used_days);
    }

    #[Test]
    public function full_workflow_admin_registers_on_behalf_no_separate_approval_needed(): void
    {
        $employee = $this->makeEmployee();
        $entitlement = $this->makeEntitlement($employee, entitledDays: 12, usedDays: 0);

        $requestResponse = $this->postJson('/api/v1/vacation-requests', [
            'employee_id' => $employee->public_id,
            'dates' => [self::DATE],
        ]);

        $requestResponse->assertStatus(201)
            ->assertJsonPath('data.status', 'APPROVED');

        $this->assertDatabaseHas('attendances', [
            'employee_id' => $employee->id,
            'date' => self::DATE,
            'day_status' => DayStatus::VACATION->value,
        ]);
        $this->assertSame(1, $entitlement->fresh()->used_days);

        $checkInResponse = $this->postJson('/api/v1/attendances/check-in', [
            'employee_id' => $employee->public_id,
            'check_in' => self::DATE.'T09:00:00-06:00',
        ]);

        $checkInResponse->assertStatus(422);
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

    private function employeeStartedOn(string $startDate): Employee
    {
        $period = EmploymentPeriod::factory()->create([
            'is_active' => true,
            'start_date' => $startDate,
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

    /**
     * @param  array<int, string>  $dates
     */
    private function createPendingVacation(
        Employee $employee,
        VacationEntitlement $entitlement,
        array $dates
    ): VacationRequest {
        $vacationRequest = VacationRequest::create([
            'employee_id' => $employee->id,
            'vacation_entitlement_id' => $entitlement->id,
            'start_date' => $dates[0],
            'end_date' => $dates[count($dates) - 1],
            'days_count' => count($dates),
            'status' => VacationRequestStatus::PENDING,
            'requested_by' => $this->user->id,
        ]);

        $this->persistDates($vacationRequest, $dates);

        return $vacationRequest;
    }

    /**
     * @param  array<int, string>  $dates
     */
    private function createApprovedVacation(
        Employee $employee,
        VacationEntitlement $entitlement,
        array $dates
    ): VacationRequest {
        $vacationRequest = VacationRequest::create([
            'employee_id' => $employee->id,
            'vacation_entitlement_id' => $entitlement->id,
            'start_date' => $dates[0],
            'end_date' => $dates[count($dates) - 1],
            'days_count' => count($dates),
            'status' => VacationRequestStatus::APPROVED,
            'requested_by' => $this->user->id,
            'approved_by' => $this->user->id,
            'approved_at' => now(),
        ]);

        $this->persistDates($vacationRequest, $dates);

        return $vacationRequest;
    }

    /**
     * @param  array<int, string>  $dates
     */
    private function persistDates(VacationRequest $vacationRequest, array $dates): void
    {
        $now = now();

        $vacationRequest->dates()->insert(array_map(fn (string $date) => [
            'vacation_request_id' => $vacationRequest->id,
            'date' => $date,
            'created_at' => $now,
            'updated_at' => $now,
        ], $dates));
    }
}
