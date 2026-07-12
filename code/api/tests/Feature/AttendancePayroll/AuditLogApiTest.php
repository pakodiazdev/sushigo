<?php

namespace Tests\Feature\AttendancePayroll;

use App\Enums\AuditAction;
use App\Models\Attendance;
use App\Models\AttendanceAuditLog;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class AuditLogApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        Permission::create(['name' => 'audit-logs.view', 'guard_name' => 'api']);

        $adminRole = Role::create(['name' => 'admin', 'guard_name' => 'api']);
        $adminRole->givePermissionTo('audit-logs.view');

        foreach (Employee::POSITION_ROLES as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);
        }

        $this->admin = User::factory()->create();
        $this->admin->assignRole('admin');

        Passport::actingAs($this->admin);
    }

    /**
     * Attendance/Employee are Auditable, so factory-creating them fires their own
     * CREATE audit log entries. Tests that assert exact counts/positions build
     * their fixtures first, then discard that incidental noise via this helper.
     */
    private function clearIncidentalAuditLogs(): void
    {
        AttendanceAuditLog::query()->delete();
    }

    #[Test]
    public function it_lists_audit_logs_filtered_by_record(): void
    {
        $attendance = Attendance::factory()->create();
        $otherAttendance = Attendance::factory()->create();
        $this->clearIncidentalAuditLogs();

        AttendanceAuditLog::factory()->update_action()->create([
            'auditable_type' => Attendance::class,
            'auditable_id' => $attendance->id,
        ]);

        AttendanceAuditLog::factory()->update_action()->create([
            'auditable_type' => Attendance::class,
            'auditable_id' => $otherAttendance->id,
        ]);

        $response = $this->getJson(
            '/api/v1/audit-logs?auditable_type='.urlencode(Attendance::class)."&auditable_id={$attendance->public_id}"
        );

        $response->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.auditable_id', $attendance->public_id);
    }

    #[Test]
    public function it_lists_audit_logs_filtered_by_employee_and_date_range(): void
    {
        $employee = Employee::factory()->create();
        $otherEmployee = Employee::factory()->create();

        $attendance = Attendance::factory()->create(['employee_id' => $employee->id]);
        $otherAttendance = Attendance::factory()->create(['employee_id' => $otherEmployee->id]);
        $this->clearIncidentalAuditLogs();

        Carbon::setTestNow(Carbon::parse('2026-06-10 10:00:00'));
        AttendanceAuditLog::factory()->update_action()->create([
            'auditable_type' => Attendance::class,
            'auditable_id' => $attendance->id,
        ]);

        Carbon::setTestNow(Carbon::parse('2026-06-20 10:00:00'));
        AttendanceAuditLog::factory()->update_action()->create([
            'auditable_type' => Attendance::class,
            'auditable_id' => $attendance->id,
        ]);

        Carbon::setTestNow(Carbon::parse('2026-07-01 10:00:00'));
        AttendanceAuditLog::factory()->update_action()->create([
            'auditable_type' => Attendance::class,
            'auditable_id' => $otherAttendance->id,
        ]);
        Carbon::setTestNow();

        $response = $this->getJson(
            "/api/v1/audit-logs?employee_id={$employee->public_id}&date_from=2026-06-01&date_to=2026-06-30"
        );

        $response->assertOk()->assertJsonPath('meta.total', 2);
    }

    #[Test]
    public function it_includes_employee_level_changes_when_filtering_by_employee(): void
    {
        $employee = Employee::factory()->create();
        $this->clearIncidentalAuditLogs();

        AttendanceAuditLog::factory()->update_action()->create([
            'auditable_type' => Employee::class,
            'auditable_id' => $employee->id,
        ]);

        $response = $this->getJson("/api/v1/audit-logs?employee_id={$employee->public_id}");

        $response->assertOk()->assertJsonPath('meta.total', 1);
    }

    #[Test]
    public function it_paginates_results(): void
    {
        $attendance = Attendance::factory()->create();
        $this->clearIncidentalAuditLogs();

        AttendanceAuditLog::factory()->count(3)->update_action()->create([
            'auditable_type' => Attendance::class,
            'auditable_id' => $attendance->id,
        ]);

        $response = $this->getJson('/api/v1/audit-logs?per_page=2');

        $response->assertOk()
            ->assertJsonPath('meta.total', 3)
            ->assertJsonPath('meta.per_page', 2)
            ->assertJsonCount(2, 'data');
    }

    #[Test]
    public function it_shows_diff_only_for_update_action(): void
    {
        $attendance = Attendance::factory()->create();
        $this->clearIncidentalAuditLogs();

        AttendanceAuditLog::factory()->create([
            'auditable_type' => Attendance::class,
            'auditable_id' => $attendance->id,
            'action' => AuditAction::UPDATE,
            'old_values' => ['check_in' => '08:15:00'],
            'new_values' => ['check_in' => '08:05:00'],
            'reason' => 'Corrección de horario',
        ]);

        $response = $this->getJson('/api/v1/audit-logs');

        $response->assertOk()
            ->assertJsonPath('data.0.action', 'UPDATE')
            ->assertJsonPath('data.0.old_values', ['check_in' => '08:15:00'])
            ->assertJsonPath('data.0.new_values', ['check_in' => '08:05:00'])
            ->assertJsonPath('data.0.reason', 'Corrección de horario');
    }

    #[Test]
    public function it_shows_null_reason_when_absent(): void
    {
        $attendance = Attendance::factory()->create();
        $this->clearIncidentalAuditLogs();

        AttendanceAuditLog::factory()->create_action()->create([
            'auditable_type' => Attendance::class,
            'auditable_id' => $attendance->id,
            'reason' => null,
        ]);

        $response = $this->getJson('/api/v1/audit-logs');

        $response->assertOk()->assertJsonPath('data.0.reason', null);
    }

    #[Test]
    public function it_shows_user_name_who_made_the_change(): void
    {
        $attendance = Attendance::factory()->create();
        $this->clearIncidentalAuditLogs();

        $editor = User::factory()->create(['name' => 'Ana García']);

        AttendanceAuditLog::factory()->update_action()->create([
            'auditable_type' => Attendance::class,
            'auditable_id' => $attendance->id,
            'user_id' => $editor->id,
        ]);

        $response = $this->getJson('/api/v1/audit-logs');

        $response->assertOk()->assertJsonPath('data.0.user', 'Ana García');
    }

    #[Test]
    public function it_records_an_audit_log_end_to_end_when_attendance_is_updated(): void
    {
        $attendance = Attendance::factory()->create(['check_in' => '2026-07-03 08:15:00']);
        $this->clearIncidentalAuditLogs();

        $attendance->auditReason = 'Corrección de horario';
        $attendance->update(['check_in' => '2026-07-03 08:05:00']);

        $response = $this->getJson(
            '/api/v1/audit-logs?auditable_type='.urlencode(Attendance::class)."&auditable_id={$attendance->public_id}"
        );

        $response->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.action', 'UPDATE')
            ->assertJsonPath('data.0.reason', 'Corrección de horario')
            ->assertJsonPath('data.0.user', $this->admin->name);
    }

    #[Test]
    public function it_enforces_view_permission(): void
    {
        $noPermissionUser = User::factory()->create();
        Passport::actingAs($noPermissionUser);

        $this->getJson('/api/v1/audit-logs')->assertStatus(403);
    }

    #[Test]
    public function it_validates_invalid_auditable_type(): void
    {
        $response = $this->getJson('/api/v1/audit-logs?auditable_type=App\\Models\\User&auditable_id=whatever');

        $response->assertStatus(422)->assertJsonValidationErrorFor('auditable_type');
    }

    #[Test]
    public function it_prohibits_combining_record_and_employee_filter_modes(): void
    {
        $employee = Employee::factory()->create();
        $attendance = Attendance::factory()->create();

        $response = $this->getJson(
            '/api/v1/audit-logs?auditable_type='.urlencode(Attendance::class)
            ."&auditable_id={$attendance->public_id}&employee_id={$employee->public_id}"
        );

        $response->assertStatus(422)->assertJsonValidationErrorFor('employee_id');
    }

    #[Test]
    public function it_validates_date_to_before_date_from(): void
    {
        $response = $this->getJson('/api/v1/audit-logs?date_from=2026-06-30&date_to=2026-06-01');

        $response->assertStatus(422)->assertJsonValidationErrorFor('date_to');
    }

    #[Test]
    public function it_validates_unknown_employee_id(): void
    {
        $response = $this->getJson('/api/v1/audit-logs?employee_id=unknown-ulid');

        $response->assertStatus(422)->assertJsonValidationErrorFor('employee_id');
    }

    #[Test]
    public function it_stays_reachable_by_employee_id_after_the_employee_is_terminated(): void
    {
        $employee = Employee::factory()->create();
        $attendance = Attendance::factory()->create(['employee_id' => $employee->id]);
        $employee->delete();
        // Includes the DELETE entry the termination itself just wrote — cleared like
        // the rest of the incidental fixture noise, since it's not under test here.
        $this->clearIncidentalAuditLogs();

        AttendanceAuditLog::factory()->update_action()->create([
            'auditable_type' => Attendance::class,
            'auditable_id' => $attendance->id,
        ]);

        $response = $this->getJson("/api/v1/audit-logs?employee_id={$employee->public_id}");

        $response->assertOk()->assertJsonPath('meta.total', 1);
    }

    #[Test]
    public function it_resolves_auditable_id_for_a_terminated_employees_own_audit_entries(): void
    {
        $employee = Employee::factory()->create();
        $employee->delete();
        $this->clearIncidentalAuditLogs();

        AttendanceAuditLog::factory()->update_action()->create([
            'auditable_type' => Employee::class,
            'auditable_id' => $employee->id,
        ]);

        $response = $this->getJson("/api/v1/audit-logs?employee_id={$employee->public_id}");

        $response->assertOk()->assertJsonPath('data.0.auditable_id', $employee->public_id);
    }

    #[Test]
    public function it_stays_reachable_by_record_mode_for_a_terminated_employee(): void
    {
        $employee = Employee::factory()->create();
        $employee->delete();
        $this->clearIncidentalAuditLogs();

        AttendanceAuditLog::factory()->update_action()->create([
            'auditable_type' => Employee::class,
            'auditable_id' => $employee->id,
        ]);

        $response = $this->getJson(
            '/api/v1/audit-logs?auditable_type='.urlencode(Employee::class)."&auditable_id={$employee->public_id}"
        );

        $response->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.auditable_id', $employee->public_id);
    }
}
