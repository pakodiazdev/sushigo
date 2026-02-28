<?php

namespace Tests\Feature\AttendancePayroll;

use App\Enums\AuditAction;
use App\Models\AttendanceAuditLog;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Schema;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class AttendanceAuditLogTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        Role::firstOrCreate(['name' => 'employee',         'guard_name' => 'api']);
        Role::firstOrCreate(['name' => 'employee-manager', 'guard_name' => 'api']);

        foreach (Employee::POSITION_ROLES as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);
        }
    }

    // #region Create log entry

    #[Test]
    public function it_can_create_a_log_entry(): void
    {
        $user = User::factory()->create();
        $employee = Employee::factory()->create();

        $log = AttendanceAuditLog::create([
            'auditable_type' => Employee::class,
            'auditable_id' => $employee->id,
            'action' => AuditAction::CREATE,
            'old_values' => null,
            'new_values' => ['first_name' => $employee->first_name],
            'user_id' => $user->id,
            'reason' => 'Initial employee registration',
        ]);

        $this->assertDatabaseHas('attendance_audit_logs', [
            'id' => $log->id,
            'auditable_type' => Employee::class,
            'auditable_id' => $employee->id,
            'action' => 'CREATE',
            'user_id' => $user->id,
        ]);
    }

    #[Test]
    public function it_stores_old_and_new_values_as_json(): void
    {
        $user = User::factory()->create();
        $employee = Employee::factory()->create();

        $log = AttendanceAuditLog::create([
            'auditable_type' => Employee::class,
            'auditable_id' => $employee->id,
            'action' => AuditAction::UPDATE,
            'old_values' => ['first_name' => 'Juan'],
            'new_values' => ['first_name' => 'Pedro'],
            'user_id' => $user->id,
        ]);

        $log->refresh();

        $this->assertEquals(['first_name' => 'Juan'], $log->old_values);
        $this->assertEquals(['first_name' => 'Pedro'], $log->new_values);
    }

    #[Test]
    public function old_values_is_null_for_create_action(): void
    {
        $user = User::factory()->create();
        $employee = Employee::factory()->create();

        $log = AttendanceAuditLog::factory()->create_action()->create([
            'auditable_type' => Employee::class,
            'auditable_id' => $employee->id,
            'user_id' => $user->id,
        ]);

        $this->assertNull($log->old_values);
    }

    #[Test]
    public function new_values_is_null_for_delete_action(): void
    {
        $user = User::factory()->create();
        $employee = Employee::factory()->create();

        $log = AttendanceAuditLog::factory()->delete_action()->create([
            'auditable_type' => Employee::class,
            'auditable_id' => $employee->id,
            'user_id' => $user->id,
        ]);

        $this->assertNull($log->new_values);
    }

    #[Test]
    public function reason_is_nullable(): void
    {
        $user = User::factory()->create();
        $employee = Employee::factory()->create();

        $log = AttendanceAuditLog::create([
            'auditable_type' => Employee::class,
            'auditable_id' => $employee->id,
            'action' => AuditAction::UPDATE,
            'old_values' => ['status' => 'active'],
            'new_values' => ['status' => 'inactive'],
            'user_id' => $user->id,
            'reason' => null,
        ]);

        $this->assertNull($log->reason);
    }

    // #endregion

    // #region Action enum cast

    #[Test]
    public function action_is_cast_to_audit_action_enum(): void
    {
        $user = User::factory()->create();
        $employee = Employee::factory()->create();

        $log = AttendanceAuditLog::factory()->update_action()->create([
            'auditable_type' => Employee::class,
            'auditable_id' => $employee->id,
            'user_id' => $user->id,
        ]);

        $log->refresh();

        $this->assertInstanceOf(AuditAction::class, $log->action);
        $this->assertSame(AuditAction::UPDATE, $log->action);
    }

    // #endregion

    // #region Polymorphic relationship

    #[Test]
    public function auditable_relationship_resolves_to_employee(): void
    {
        $user = User::factory()->create();
        $employee = Employee::factory()->create();

        $log = AttendanceAuditLog::create([
            'auditable_type' => Employee::class,
            'auditable_id' => $employee->id,
            'action' => AuditAction::CREATE,
            'old_values' => null,
            'new_values' => ['first_name' => $employee->first_name],
            'user_id' => $user->id,
        ]);

        $resolved = $log->auditable;

        $this->assertInstanceOf(Employee::class, $resolved);
        $this->assertTrue($resolved->is($employee));
    }

    #[Test]
    public function user_relationship_resolves_correctly(): void
    {
        $user = User::factory()->create();
        $employee = Employee::factory()->create();

        $log = AttendanceAuditLog::factory()->create_action()->create([
            'auditable_type' => Employee::class,
            'auditable_id' => $employee->id,
            'user_id' => $user->id,
        ]);

        $this->assertTrue($log->user->is($user));
    }

    // #endregion

    // #region created_at

    #[Test]
    public function created_at_is_set_automatically(): void
    {
        $user = User::factory()->create();
        $employee = Employee::factory()->create();

        $log = AttendanceAuditLog::create([
            'auditable_type' => Employee::class,
            'auditable_id' => $employee->id,
            'action' => AuditAction::CREATE,
            'old_values' => null,
            'new_values' => [],
            'user_id' => $user->id,
        ]);

        $this->assertNotNull($log->created_at);
        $this->assertInstanceOf(Carbon::class, $log->created_at);
    }

    #[Test]
    public function there_is_no_updated_at_column(): void
    {
        $user = User::factory()->create();
        $employee = Employee::factory()->create();

        $log = AttendanceAuditLog::create([
            'auditable_type' => Employee::class,
            'auditable_id' => $employee->id,
            'action' => AuditAction::DELETE,
            'old_values' => ['first_name' => 'Ana'],
            'new_values' => null,
            'user_id' => $user->id,
        ]);

        // updated_at must not exist as a column on this model
        $this->assertFalse(
            Schema::hasColumn('attendance_audit_logs', 'updated_at')
        );
    }

    // #endregion

    // #region Index coverage

    #[Test]
    public function multiple_logs_for_same_auditable_can_be_queried(): void
    {
        $user = User::factory()->create();
        $employee = Employee::factory()->create();

        AttendanceAuditLog::factory()->create_action()->create([
            'auditable_type' => Employee::class,
            'auditable_id' => $employee->id,
            'user_id' => $user->id,
        ]);

        AttendanceAuditLog::factory()->update_action()->create([
            'auditable_type' => Employee::class,
            'auditable_id' => $employee->id,
            'user_id' => $user->id,
        ]);

        $logs = AttendanceAuditLog::where('auditable_type', Employee::class)
            ->where('auditable_id', $employee->id)
            ->get();

        $this->assertCount(2, $logs);
    }
    // #endregion

}
