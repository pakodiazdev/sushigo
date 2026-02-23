<?php

namespace Tests\Feature\AttendancePayroll;

use App\Enums\AuditAction;
use App\Enums\DayStatus;
use App\Models\Attendance;
use App\Models\AttendanceAuditLog;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AuditableTraitTest extends TestCase
{
    use RefreshDatabase;

    private Employee $employee;
    private User $actor;

    protected function setUp(): void
    {
        parent::setUp();

        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        Role::firstOrCreate(['name' => 'employee',         'guard_name' => 'api']);
        Role::firstOrCreate(['name' => 'employee-manager', 'guard_name' => 'api']);

        foreach (Employee::POSITION_ROLES as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);
        }

        $this->employee = Employee::factory()->create();
        $this->actor    = User::factory()->create();
    }

    // ── CREATE ────────────────────────────────────────────────────────────────

    #[Test]
    public function creating_attendance_writes_create_audit_log(): void
    {
        $this->actingAs($this->actor, 'api');

        $attendance = Attendance::factory()->worked()->create([
            'employee_id' => $this->employee->id,
            'date'        => '2026-02-10',
        ]);

        $this->assertDatabaseCount('attendance_audit_logs', 1);

        $log = AttendanceAuditLog::first();

        $this->assertSame(AuditAction::CREATE, $log->action);
        $this->assertSame(Attendance::class,   $log->auditable_type);
        $this->assertSame($attendance->id,     $log->auditable_id);
        $this->assertSame($this->actor->id,    $log->user_id);
        $this->assertNull($log->old_values);
        $this->assertNotNull($log->new_values);
        $this->assertArrayHasKey('employee_id', $log->new_values);
    }

    #[Test]
    public function create_log_new_values_contains_all_fillable_attributes(): void
    {
        $this->actingAs($this->actor, 'api');

        Attendance::factory()->worked()->create([
            'employee_id'        => $this->employee->id,
            'date'               => '2026-02-10',
            'entry_late_seconds' => 900,
        ]);

        $log = AttendanceAuditLog::first();

        $this->assertArrayHasKey('employee_id',        $log->new_values);
        $this->assertArrayHasKey('date',               $log->new_values);
        $this->assertArrayHasKey('entry_late_seconds', $log->new_values);
        $this->assertArrayHasKey('day_status',         $log->new_values);
        // Enum value must be stored as its string representation
        $this->assertSame('WORKED', $log->new_values['day_status']);
    }

    // ── UPDATE ────────────────────────────────────────────────────────────────

    #[Test]
    public function updating_attendance_writes_update_audit_log_with_diff_only(): void
    {
        $this->actingAs($this->actor, 'api');

        $attendance = Attendance::factory()->worked()->create([
            'employee_id'        => $this->employee->id,
            'date'               => '2026-02-10',
            'entry_late_seconds' => 0,
        ]);

        // Clear the CREATE log so we only assert on the UPDATE
        AttendanceAuditLog::truncate();

        $attendance->update(['entry_late_seconds' => 3600]);

        $this->assertDatabaseCount('attendance_audit_logs', 1);

        $log = AttendanceAuditLog::first();

        $this->assertSame(AuditAction::UPDATE, $log->action);
        $this->assertSame($attendance->id,     $log->auditable_id);
        $this->assertSame($this->actor->id,    $log->user_id);

        // old_values must contain only the changed field
        $this->assertArrayHasKey('entry_late_seconds', $log->old_values);
        $this->assertSame(0, $log->old_values['entry_late_seconds']);

        // new_values must contain only the changed field
        $this->assertArrayHasKey('entry_late_seconds', $log->new_values);
        $this->assertSame(3600, $log->new_values['entry_late_seconds']);

        // Unchanged fields must NOT appear in the diff
        $this->assertArrayNotHasKey('employee_id', $log->old_values);
        $this->assertArrayNotHasKey('employee_id', $log->new_values);
    }

    #[Test]
    public function update_log_records_multiple_changed_fields(): void
    {
        $this->actingAs($this->actor, 'api');

        $attendance = Attendance::factory()->worked()->create([
            'employee_id'        => $this->employee->id,
            'date'               => '2026-02-10',
            'entry_late_seconds' => 0,
            'overtime_minutes'   => 0,
        ]);

        AttendanceAuditLog::truncate();

        $attendance->update([
            'entry_late_seconds' => 2700,
            'overtime_minutes'   => 45,
        ]);

        $log = AttendanceAuditLog::first();

        $this->assertArrayHasKey('entry_late_seconds', $log->old_values);
        $this->assertArrayHasKey('overtime_minutes',   $log->old_values);
        $this->assertArrayHasKey('entry_late_seconds', $log->new_values);
        $this->assertArrayHasKey('overtime_minutes',   $log->new_values);
        $this->assertSame(2700, $log->new_values['entry_late_seconds']);
        $this->assertSame(45,   $log->new_values['overtime_minutes']);
    }

    #[Test]
    public function update_log_stores_enum_as_string_value(): void
    {
        $this->actingAs($this->actor, 'api');

        $attendance = Attendance::factory()->worked()->create([
            'employee_id' => $this->employee->id,
            'date'        => '2026-02-10',
        ]);

        AttendanceAuditLog::truncate();

        $attendance->update(['day_status' => DayStatus::ABSENCE]);

        $log = AttendanceAuditLog::first();

        $this->assertSame('WORKED',  $log->old_values['day_status']);
        $this->assertSame('ABSENCE', $log->new_values['day_status']);
    }

    // ── DELETE ────────────────────────────────────────────────────────────────

    #[Test]
    public function deleting_attendance_writes_delete_audit_log(): void
    {
        $this->actingAs($this->actor, 'api');

        $attendance = Attendance::factory()->worked()->create([
            'employee_id' => $this->employee->id,
            'date'        => '2026-02-10',
        ]);

        AttendanceAuditLog::truncate();

        $attendance->delete();

        $this->assertDatabaseCount('attendance_audit_logs', 1);

        $log = AttendanceAuditLog::first();

        $this->assertSame(AuditAction::DELETE, $log->action);
        $this->assertSame($attendance->id,     $log->auditable_id);
        $this->assertNull($log->new_values);
        $this->assertNotNull($log->old_values);
        $this->assertArrayHasKey('employee_id', $log->old_values);
    }

    // ── auditReason ───────────────────────────────────────────────────────────

    #[Test]
    public function audit_reason_is_stored_when_set_before_update(): void
    {
        $this->actingAs($this->actor, 'api');

        $attendance = Attendance::factory()->worked()->create([
            'employee_id' => $this->employee->id,
            'date'        => '2026-02-10',
        ]);

        AttendanceAuditLog::truncate();

        $attendance->auditReason = 'Admin correction — terminal error confirmed by camera';
        $attendance->update(['entry_late_seconds' => 900]);

        $log = AttendanceAuditLog::first();

        $this->assertSame('Admin correction — terminal error confirmed by camera', $log->reason);
    }

    #[Test]
    public function audit_reason_is_cleared_after_first_use(): void
    {
        $this->actingAs($this->actor, 'api');

        $attendance = Attendance::factory()->worked()->create([
            'employee_id' => $this->employee->id,
            'date'        => '2026-02-10',
        ]);

        $attendance->auditReason = 'First reason';
        $attendance->update(['entry_late_seconds' => 900]);

        // Second update — reason must NOT carry over
        $attendance->update(['overtime_minutes' => 30]);

        $logs = AttendanceAuditLog::where('action', AuditAction::UPDATE)->get();

        // First update: has reason
        $firstUpdateLog = $logs->first(
            fn ($l) => isset($l->new_values['entry_late_seconds']) && $l->new_values['entry_late_seconds'] === 900
        );
        $this->assertSame('First reason', $firstUpdateLog->reason);

        // Second update: no reason
        $secondUpdateLog = $logs->first(
            fn ($l) => isset($l->new_values['overtime_minutes']) && $l->new_values['overtime_minutes'] === 30
        );
        $this->assertNull($secondUpdateLog->reason);
    }

    #[Test]
    public function audit_reason_is_null_by_default(): void
    {
        $this->actingAs($this->actor, 'api');

        Attendance::factory()->worked()->create([
            'employee_id' => $this->employee->id,
            'date'        => '2026-02-10',
        ]);

        $log = AttendanceAuditLog::first();

        $this->assertNull($log->reason);
    }

    // ── Polymorphic relationship ───────────────────────────────────────────────

    #[Test]
    public function audit_log_auditable_resolves_back_to_attendance(): void
    {
        $this->actingAs($this->actor, 'api');

        $attendance = Attendance::factory()->worked()->create([
            'employee_id' => $this->employee->id,
            'date'        => '2026-02-10',
        ]);

        $log = AttendanceAuditLog::first();

        $this->assertInstanceOf(Attendance::class, $log->auditable);
        $this->assertTrue($log->auditable->is($attendance));
    }

    // ── No auth user ──────────────────────────────────────────────────────────

    #[Test]
    public function audit_log_user_id_is_null_when_no_authenticated_user(): void
    {
        // Unauthenticated context (e.g. CLI commands, seeders)
        $attendance = Attendance::factory()->worked()->create([
            'employee_id' => $this->employee->id,
            'date'        => '2026-02-10',
        ]);

        $log = AttendanceAuditLog::first();

        $this->assertNull($log->user_id);
    }
}
