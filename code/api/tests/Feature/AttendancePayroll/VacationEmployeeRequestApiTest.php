<?php

namespace Tests\Feature\AttendancePayroll;

use App\Enums\DayStatus;
use App\Enums\EmployeeRequestStatus;
use App\Enums\EmployeeRequestType;
use App\Models\Attendance;
use App\Models\Employee;
use App\Models\EmploymentPeriod;
use App\Models\User;
use App\Models\VacationEntitlement;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class VacationEmployeeRequestApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $manager;

    protected User $selfServiceUser;

    private const DATE = '2026-08-10';

    private const YEAR = 2026;

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

        $selfServiceRole = Role::create(['name' => 'employee', 'guard_name' => 'api']);
        $selfServiceRole->givePermissionTo(['employee-requests.create', 'employee-requests.cancel']);

        foreach (Employee::POSITION_ROLES as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);
        }

        $this->manager = User::factory()->create();
        $this->manager->assignRole('manager');

        $this->selfServiceUser = User::factory()->create();
        $this->selfServiceUser->assignRole('employee');

        Passport::actingAs($this->manager);

        Carbon::setTestNow(Carbon::parse(self::DATE.' 10:00:00'));
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Self-service create → PENDING, nothing materialized yet
    // ══════════════════════════════════════════════════════════════════════════

    #[Test]
    public function self_service_creates_pending_vacation_request_without_materializing(): void
    {
        Passport::actingAs($this->selfServiceUser);

        $employee = $this->makeEmployee();
        $this->makeEntitlement($employee, entitledDays: 12, usedDays: 0);

        $response = $this->postJson('/api/v1/employee-requests', [
            'employee_id' => $employee->public_id,
            'type' => EmployeeRequestType::VACATION->value,
            'payload' => ['dates' => [self::DATE]],
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.status', EmployeeRequestStatus::PENDING->value)
            ->assertJsonPath('data.requestable', null);

        $this->assertDatabaseMissing('vacation_requests', ['employee_id' => $employee->id]);
        $this->assertDatabaseMissing('attendances', ['employee_id' => $employee->id, 'date' => self::DATE]);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Approve → materializes VacationRequest + dates + entitlement + attendance
    // ══════════════════════════════════════════════════════════════════════════

    #[Test]
    public function approving_materializes_vacation_request_and_deducts_balance(): void
    {
        $employee = $this->makeEmployee();
        $entitlement = $this->makeEntitlement($employee, entitledDays: 12, usedDays: 0);
        $requestId = $this->createVacationRequest($employee, ['dates' => [self::DATE]]);

        $response = $this->patchJson("/api/v1/employee-requests/{$requestId}/approve");

        $response->assertOk()
            ->assertJsonPath('data.status', EmployeeRequestStatus::APPROVED->value)
            ->assertJsonPath('data.requestable.type', 'App\\Models\\VacationRequest');

        $this->assertDatabaseHas('vacation_requests', [
            'employee_id' => $employee->id,
            'status' => 'APPROVED',
            'approved_by' => $this->manager->id,
        ]);
        $this->assertDatabaseHas('vacation_request_dates', ['date' => self::DATE]);

        $this->assertDatabaseHas('attendances', [
            'employee_id' => $employee->id,
            'date' => self::DATE,
            'day_status' => DayStatus::VACATION->value,
        ]);

        $this->assertSame(1, $entitlement->fresh()->used_days);
    }

    #[Test]
    public function approving_materializes_non_contiguous_days_correctly(): void
    {
        $employee = $this->makeEmployee();
        $entitlement = $this->makeEntitlement($employee, entitledDays: 12, usedDays: 0);
        $requestId = $this->createVacationRequest($employee, ['dates' => ['2026-08-10', '2026-08-12']]);

        $response = $this->patchJson("/api/v1/employee-requests/{$requestId}/approve");

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
        $this->assertSame(2, $entitlement->fresh()->used_days);
    }

    #[Test]
    public function cannot_approve_if_worked_attendance_exists(): void
    {
        $employee = $this->makeEmployee();
        $this->makeEntitlement($employee, entitledDays: 12, usedDays: 0);
        $requestId = $this->createVacationRequest($employee, ['dates' => [self::DATE]]);

        Attendance::create([
            'employee_id' => $employee->id,
            'date' => self::DATE,
            'day_status' => DayStatus::WORKED,
            'check_in' => now(),
        ]);

        $response = $this->patchJson("/api/v1/employee-requests/{$requestId}/approve");

        $response->assertStatus(422)
            ->assertJsonValidationErrorFor('dates');

        $this->assertDatabaseHas('employee_requests', [
            'public_id' => $requestId,
            'status' => EmployeeRequestStatus::PENDING->value,
        ]);
        $this->assertDatabaseMissing('vacation_requests', ['employee_id' => $employee->id]);
    }

    #[Test]
    public function cannot_approve_when_balance_became_insufficient(): void
    {
        $employee = $this->makeEmployee();
        $entitlement = $this->makeEntitlement($employee, entitledDays: 12, usedDays: 0);
        $requestId = $this->createVacationRequest($employee, ['dates' => ['2026-08-10', '2026-08-11', '2026-08-12']]);

        // Balance changes between request creation and approval (e.g. another vacation got approved meanwhile)
        $entitlement->update(['used_days' => 11]);

        $response = $this->patchJson("/api/v1/employee-requests/{$requestId}/approve");

        $response->assertStatus(422)
            ->assertJsonValidationErrorFor('dates');
    }

    #[Test]
    public function approves_using_the_anniversary_entitlement_even_when_request_dates_fall_in_the_next_calendar_year(): void
    {
        // Reproduces the real-world case: an employee's anniversary (and thus their
        // VacationEntitlement) falls in one calendar year, but they self-service a
        // vacation request for dates in the following calendar year — still within
        // that same service-year window. No entitlement was ever pre-generated
        // (nobody visited the Vacaciones section) — it must be generated on approval.
        $employee = $this->employeeStartedOn('2024-09-01');
        $this->assertDatabaseCount('vacation_entitlements', 0);

        $requestId = $this->createVacationRequest($employee, ['dates' => [self::DATE]]);

        $response = $this->patchJson("/api/v1/employee-requests/{$requestId}/approve");

        $response->assertOk()
            ->assertJsonPath('data.status', EmployeeRequestStatus::APPROVED->value);

        $this->assertDatabaseHas('vacation_entitlements', [
            'employee_id' => $employee->id,
            'year' => 2025,
        ]);
        $this->assertDatabaseHas('vacation_requests', [
            'employee_id' => $employee->id,
            'status' => 'APPROVED',
        ]);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Reject
    // ══════════════════════════════════════════════════════════════════════════

    #[Test]
    public function rejects_pending_vacation_request_without_materializing(): void
    {
        $employee = $this->makeEmployee();
        $entitlement = $this->makeEntitlement($employee, entitledDays: 12, usedDays: 0);
        $requestId = $this->createVacationRequest($employee, ['dates' => [self::DATE]]);

        $response = $this->patchJson("/api/v1/employee-requests/{$requestId}/reject", [
            'reason' => 'No hay cobertura ese día',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.status', EmployeeRequestStatus::REJECTED->value);

        $this->assertDatabaseMissing('vacation_requests', ['employee_id' => $employee->id]);
        $this->assertSame(0, $entitlement->fresh()->used_days);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Cancel — reverts balance and removes attendance
    // ══════════════════════════════════════════════════════════════════════════

    #[Test]
    public function cancelling_an_approved_vacation_request_reverts_balance_and_attendance(): void
    {
        $employee = $this->makeEmployee();
        $entitlement = $this->makeEntitlement($employee, entitledDays: 12, usedDays: 0);
        $requestId = $this->createVacationRequest($employee, ['dates' => [self::DATE]]);

        $this->patchJson("/api/v1/employee-requests/{$requestId}/approve")->assertOk();
        $this->assertSame(1, $entitlement->fresh()->used_days);

        $cancelResponse = $this->patchJson("/api/v1/employee-requests/{$requestId}/cancel");

        $cancelResponse->assertOk()
            ->assertJsonPath('data.status', EmployeeRequestStatus::CANCELLED->value)
            ->assertJsonPath('data.requestable', null);

        $this->assertDatabaseMissing('vacation_requests', ['employee_id' => $employee->id]);
        $this->assertDatabaseMissing('attendances', [
            'employee_id' => $employee->id,
            'date' => self::DATE,
        ]);
        $this->assertSame(0, $entitlement->fresh()->used_days);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Guards / validation
    // ══════════════════════════════════════════════════════════════════════════

    #[Test]
    public function rejects_vacation_type_without_dates(): void
    {
        $employee = $this->makeEmployee();

        $response = $this->postJson('/api/v1/employee-requests', [
            'employee_id' => $employee->public_id,
            'type' => EmployeeRequestType::VACATION->value,
            'payload' => [],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrorFor('payload.dates');
    }

    #[Test]
    public function auto_approve_requires_employee_requests_approve_permission(): void
    {
        Passport::actingAs($this->selfServiceUser);

        $employee = $this->makeEmployee();
        $this->makeEntitlement($employee, entitledDays: 12, usedDays: 0);

        $this->postJson('/api/v1/employee-requests', [
            'employee_id' => $employee->public_id,
            'type' => EmployeeRequestType::VACATION->value,
            'auto_approve' => true,
            'payload' => ['dates' => [self::DATE]],
        ])->assertStatus(403);
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

    private function createVacationRequest(Employee $employee, array $payload): string
    {
        Passport::actingAs($this->selfServiceUser);

        $response = $this->postJson('/api/v1/employee-requests', [
            'employee_id' => $employee->public_id,
            'type' => EmployeeRequestType::VACATION->value,
            'payload' => $payload,
        ]);

        Passport::actingAs($this->manager);

        return $response->json('data.id');
    }
}
