<?php

namespace Tests\Feature\AttendancePayroll;

use App\Models\Attendance;
use App\Models\Branch;
use App\Models\Employee;
use App\Models\EmploymentPeriod;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class AttendanceEditPermissionsTest extends TestCase
{
    use RefreshDatabase;

    protected User $managerUser;

    protected User $adminUser;

    protected Branch $branch;

    protected Employee $employee;

    protected string $today;

    protected string $yesterday;

    protected function setUp(): void
    {
        parent::setUp();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        Role::firstOrCreate(['name' => 'manager',     'guard_name' => 'api']);
        Role::firstOrCreate(['name' => 'admin',       'guard_name' => 'api']);
        Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'api']);

        foreach (Employee::POSITION_ROLES as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);
        }

        $this->managerUser = User::factory()->create();
        $this->managerUser->assignRole('manager');

        $this->adminUser = User::factory()->create();
        $this->adminUser->assignRole('admin');

        $this->branch = Branch::factory()->create();

        $period = EmploymentPeriod::factory()->create([
            'branch_id' => $this->branch->id,
            'is_active' => true,
            'start_date' => '2026-01-01',
        ]);
        $this->employee = $period->employee;

        $this->today = Carbon::today(config('app.business_timezone'))->toDateString();
        $this->yesterday = Carbon::yesterday(config('app.business_timezone'))->toDateString();
    }

    // ─── PATCH /{id}/check-out ────────────────────────────────────────────────

    #[Test]
    public function manager_can_check_out_todays_attendance(): void
    {
        $attendance = $this->attendanceWithCheckIn($this->today);
        Passport::actingAs($this->managerUser);

        $response = $this->patchJson("/api/v1/attendances/{$attendance->public_id}/check-out", [
            'check_out' => $this->today.'T17:00:00-06:00',
        ]);

        $response->assertStatus(200);
    }

    #[Test]
    public function manager_gets_403_when_editing_past_check_out(): void
    {
        $attendance = $this->attendanceWithCheckIn($this->yesterday);
        Passport::actingAs($this->managerUser);

        $response = $this->patchJson("/api/v1/attendances/{$attendance->public_id}/check-out", [
            'check_out' => $this->yesterday.'T17:00:00-06:00',
        ]);

        $response->assertStatus(403);
    }

    #[Test]
    public function admin_gets_422_editing_past_check_out_without_reason(): void
    {
        $attendance = $this->attendanceWithCheckIn($this->yesterday);
        Passport::actingAs($this->adminUser);

        $response = $this->patchJson("/api/v1/attendances/{$attendance->public_id}/check-out", [
            'check_out' => $this->yesterday.'T17:00:00-06:00',
        ]);

        $response->assertStatus(422);
        $this->assertArrayHasKey('reason', $response->json('errors'));
    }

    #[Test]
    public function admin_can_check_out_past_attendance_with_reason(): void
    {
        $attendance = $this->attendanceWithCheckIn($this->yesterday);
        Passport::actingAs($this->adminUser);

        $response = $this->patchJson("/api/v1/attendances/{$attendance->public_id}/check-out", [
            'check_out' => $this->yesterday.'T17:00:00-06:00',
            'reason' => 'Corrección retroactiva autorizada por RH',
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('attendance_audit_logs', [
            'auditable_type' => Attendance::class,
            'auditable_id' => $attendance->id,
            'reason' => 'Corrección retroactiva autorizada por RH',
        ]);
    }

    // ─── PATCH /{id}/lunch-start ──────────────────────────────────────────────

    #[Test]
    public function manager_gets_403_when_editing_past_lunch_start(): void
    {
        $attendance = $this->attendanceWithCheckIn($this->yesterday);
        Passport::actingAs($this->managerUser);

        $response = $this->patchJson("/api/v1/attendances/{$attendance->public_id}/lunch-start", [
            'lunch_start' => $this->yesterday.'T13:00:00-06:00',
        ]);

        $response->assertStatus(403);
    }

    #[Test]
    public function admin_can_edit_past_lunch_start_with_reason(): void
    {
        $attendance = $this->attendanceWithCheckIn($this->yesterday);
        Passport::actingAs($this->adminUser);

        $response = $this->patchJson("/api/v1/attendances/{$attendance->public_id}/lunch-start", [
            'lunch_start' => $this->yesterday.'T13:00:00-06:00',
            'reason' => 'Corrección retroactiva',
        ]);

        $response->assertStatus(200);
    }

    // ─── PATCH /{id}/lunch-return ─────────────────────────────────────────────

    #[Test]
    public function manager_gets_403_when_editing_past_lunch_return(): void
    {
        $attendance = $this->attendanceWithLunchStart($this->yesterday);
        Passport::actingAs($this->managerUser);

        $response = $this->patchJson("/api/v1/attendances/{$attendance->public_id}/lunch-return", [
            'lunch_end' => $this->yesterday.'T14:00:00-06:00',
        ]);

        $response->assertStatus(403);
    }

    #[Test]
    public function admin_can_edit_past_lunch_return_with_reason(): void
    {
        $attendance = $this->attendanceWithLunchStart($this->yesterday);
        Passport::actingAs($this->adminUser);

        $response = $this->patchJson("/api/v1/attendances/{$attendance->public_id}/lunch-return", [
            'lunch_end' => $this->yesterday.'T14:00:00-06:00',
            'reason' => 'Corrección retroactiva',
        ]);

        $response->assertStatus(200);
    }

    // ─── PATCH /{id}/overtime-decision ───────────────────────────────────────

    #[Test]
    public function manager_gets_403_when_deciding_overtime_for_past_day(): void
    {
        $attendance = $this->attendanceWithOvertime($this->yesterday);
        Passport::actingAs($this->managerUser);

        $response = $this->patchJson("/api/v1/attendances/{$attendance->public_id}/overtime-decision", [
            'authorize' => true,
        ]);

        $response->assertStatus(403);
    }

    #[Test]
    public function admin_can_decide_overtime_for_past_day_with_reason(): void
    {
        $attendance = $this->attendanceWithOvertime($this->yesterday);
        Passport::actingAs($this->adminUser);

        $response = $this->patchJson("/api/v1/attendances/{$attendance->public_id}/overtime-decision", [
            'authorize' => true,
            'reason' => 'Autorización retroactiva',
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('attendance_audit_logs', [
            'auditable_type' => Attendance::class,
            'auditable_id' => $attendance->id,
            'reason' => 'Autorización retroactiva',
        ]);
    }

    // ─── POST /day-status ─────────────────────────────────────────────────────

    #[Test]
    public function manager_gets_403_when_marking_past_day_status(): void
    {
        Passport::actingAs($this->managerUser);

        $response = $this->postJson('/api/v1/attendances/day-status', [
            'employee_id' => $this->employee->public_id,
            'date' => $this->yesterday,
            'day_status' => 'ABSENCE',
        ]);

        $response->assertStatus(403);
    }

    #[Test]
    public function admin_gets_422_when_marking_past_day_status_without_reason(): void
    {
        Passport::actingAs($this->adminUser);

        $response = $this->postJson('/api/v1/attendances/day-status', [
            'employee_id' => $this->employee->public_id,
            'date' => $this->yesterday,
            'day_status' => 'ABSENCE',
        ]);

        $response->assertStatus(422);
        $this->assertArrayHasKey('reason', $response->json('errors'));
    }

    #[Test]
    public function admin_can_mark_past_day_status_with_reason(): void
    {
        Passport::actingAs($this->adminUser);

        $response = $this->postJson('/api/v1/attendances/day-status', [
            'employee_id' => $this->employee->public_id,
            'date' => $this->yesterday,
            'day_status' => 'ABSENCE',
            'reason' => 'Corrección retroactiva',
        ]);

        $response->assertStatus(201);
    }

    #[Test]
    public function manager_can_mark_todays_day_status(): void
    {
        Passport::actingAs($this->managerUser);

        $response = $this->postJson('/api/v1/attendances/day-status', [
            'employee_id' => $this->employee->public_id,
            'date' => $this->today,
            'day_status' => 'ABSENCE',
        ]);

        $response->assertStatus(201);
    }

    // ─── GET /attendances/today?date= ─────────────────────────────────────────

    #[Test]
    public function daily_endpoint_accepts_optional_date_param(): void
    {
        Passport::actingAs($this->managerUser);

        $response = $this->getJson("/api/v1/attendances/today?branch_id={$this->branch->id}&date={$this->yesterday}");

        $response->assertStatus(200);
    }

    #[Test]
    public function daily_endpoint_defaults_to_today_when_no_date(): void
    {
        Passport::actingAs($this->managerUser);

        $response = $this->getJson("/api/v1/attendances/today?branch_id={$this->branch->id}");

        $response->assertStatus(200);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private function attendanceWithCheckIn(string $date): Attendance
    {
        return Attendance::factory()->onDate($date)->create([
            'employee_id' => $this->employee->id,
            'check_in' => $date.' 09:00:00',
            'check_out' => null,
            'lunch_start' => null,
            'lunch_end' => null,
        ]);
    }

    private function attendanceWithLunchStart(string $date): Attendance
    {
        return Attendance::factory()->onDate($date)->create([
            'employee_id' => $this->employee->id,
            'check_in' => $date.' 09:00:00',
            'lunch_start' => $date.' 13:00:00',
            'lunch_end' => null,
            'check_out' => null,
        ]);
    }

    private function attendanceWithOvertime(string $date): Attendance
    {
        return Attendance::factory()->onDate($date)->create([
            'employee_id' => $this->employee->id,
            'check_in' => $date.' 09:00:00',
            'check_out' => $date.' 19:00:00',
            'overtime_minutes' => 60,
        ]);
    }
}
