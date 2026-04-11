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

class RegisterDirectLeaveApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    private const DATE = '2026-04-09';

    protected function setUp(): void
    {
        parent::setUp();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        Permission::create(['name' => 'attendances.create', 'guard_name' => 'api']);
        Permission::create(['name' => 'leaves.register-direct', 'guard_name' => 'api']);
        $role = Role::create(['name' => 'manager', 'guard_name' => 'api']);
        $role->givePermissionTo('attendances.create');
        $role->givePermissionTo('leaves.register-direct');

        Role::firstOrCreate(['name' => 'employee', 'guard_name' => 'api']);
        foreach (Employee::POSITION_ROLES as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);
        }

        $this->user = User::factory()->create();
        $this->user->assignRole('manager');

        Passport::actingAs($this->user);

        // Seed default leave types directly
        $this->seedLeaveTypes();

        Carbon::setTestNow(Carbon::parse(self::DATE.' 10:00:00'));
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    // ── Happy path ────────────────────────────────────────────────────────────

    #[Test]
    public function registers_full_day_fixed_percentage_leave_and_creates_attendance(): void
    {
        $employee = $this->makeEmployee();
        $leaveType = LeaveType::where('code', LeaveType::MEDICAL)->first();

        $response = $this->postJson('/api/v1/leaves', [
            'employee_id' => $employee->public_id,
            'leave_type_id' => $leaveType->id,
            'start_date' => self::DATE,
            'end_date' => self::DATE,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.status', LeaveStatus::APPROVED->value)
            ->assertJsonPath('data.resolved_pay_percentage', 0)
            ->assertJsonPath('data.resolved_rest_day_factor', 'NONE')
            ->assertJsonPath('data.leave_type.code', LeaveType::MEDICAL);

        $this->assertDatabaseHas('leaves', [
            'employee_id' => $employee->id,
            'start_date' => self::DATE,
            'status' => LeaveStatus::APPROVED->value,
        ]);

        $this->assertDatabaseHas('attendances', [
            'employee_id' => $employee->id,
            'date' => self::DATE,
            'day_status' => DayStatus::LEAVE->value,
        ]);
    }

    #[Test]
    public function registers_multi_day_leave_and_creates_attendance_for_each_day(): void
    {
        $employee = $this->makeEmployee();
        $leaveType = LeaveType::where('code', LeaveType::MEDICAL)->first();

        $response = $this->postJson('/api/v1/leaves', [
            'employee_id' => $employee->public_id,
            'leave_type_id' => $leaveType->id,
            'start_date' => '2026-04-09',
            'end_date' => '2026-04-11',
        ]);

        $response->assertStatus(201);

        foreach (['2026-04-09', '2026-04-10', '2026-04-11'] as $date) {
            $this->assertDatabaseHas('attendances', [
                'employee_id' => $employee->id,
                'date' => $date,
                'day_status' => DayStatus::LEAVE->value,
            ]);
        }
    }

    #[Test]
    public function pay_percentage_override_is_stored_and_returned(): void
    {
        $employee = $this->makeEmployee();
        $leaveType = LeaveType::where('code', LeaveType::MEDICAL)->first();

        $response = $this->postJson('/api/v1/leaves', [
            'employee_id' => $employee->public_id,
            'leave_type_id' => $leaveType->id,
            'start_date' => self::DATE,
            'end_date' => self::DATE,
            'pay_percentage' => 30.00,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.resolved_pay_percentage', 30);

        $this->assertDatabaseHas('leaves', [
            'employee_id' => $employee->id,
            'pay_percentage' => '30.00',
        ]);
    }

    #[Test]
    public function registers_proportional_hours_leave_with_scheduled_mode(): void
    {
        $employee = $this->makeEmployee();
        $leaveType = LeaveType::where('code', LeaveType::PERMISSION_HOURS)->first();

        $response = $this->postJson('/api/v1/leaves', [
            'employee_id' => $employee->public_id,
            'leave_type_id' => $leaveType->id,
            'start_date' => self::DATE,
            'end_date' => self::DATE,
            'time_mode' => 'SCHEDULED',
            'scheduled_start_time' => '14:00',
            'scheduled_end_time' => '16:00',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.time_mode', 'SCHEDULED')
            ->assertJsonPath('data.computed_duration_minutes', 120);

        $this->assertDatabaseHas('attendances', [
            'employee_id' => $employee->id,
            'date' => self::DATE,
            'day_status' => DayStatus::LEAVE->value,
        ]);
    }

    #[Test]
    public function registers_proportional_hours_leave_with_open_ended_mode(): void
    {
        $employee = $this->makeEmployee();
        $leaveType = LeaveType::where('code', LeaveType::PERMISSION_HOURS)->first();

        $response = $this->postJson('/api/v1/leaves', [
            'employee_id' => $employee->public_id,
            'leave_type_id' => $leaveType->id,
            'start_date' => self::DATE,
            'end_date' => self::DATE,
            'time_mode' => 'OPEN_ENDED',
            'scheduled_start_time' => '15:00',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.time_mode', 'OPEN_ENDED')
            ->assertJsonPath('data.scheduled_end_time', null);
    }

    #[Test]
    public function actual_times_compute_duration_minutes(): void
    {
        $employee = $this->makeEmployee();
        $leaveType = LeaveType::where('code', LeaveType::PERMISSION_HOURS)->first();

        $response = $this->postJson('/api/v1/leaves', [
            'employee_id' => $employee->public_id,
            'leave_type_id' => $leaveType->id,
            'start_date' => self::DATE,
            'end_date' => self::DATE,
            'time_mode' => 'SCHEDULED',
            'scheduled_start_time' => '14:00',
            'scheduled_end_time' => '16:00',
            'actual_start_time' => '14:05',
            'actual_end_time' => '16:10',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.actual_duration_minutes', 125);
    }

    // ── Guard: overlapping leave ──────────────────────────────────────────────

    #[Test]
    public function rejects_leave_if_approved_leave_already_covers_date(): void
    {
        $employee = $this->makeEmployee();
        $leaveType = LeaveType::where('code', LeaveType::MEDICAL)->first();

        // Pre-existing approved leave
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

        $response = $this->postJson('/api/v1/leaves', [
            'employee_id' => $employee->public_id,
            'leave_type_id' => $leaveType->id,
            'start_date' => self::DATE,
            'end_date' => self::DATE,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrorFor('start_date');
    }

    // ── Guard: check-in blocked ───────────────────────────────────────────────

    #[Test]
    public function blocks_check_in_after_approved_leave_is_registered(): void
    {
        $employee = $this->makeEmployee();
        $leaveType = LeaveType::where('code', LeaveType::MEDICAL)->first();

        // Register the leave
        $this->postJson('/api/v1/leaves', [
            'employee_id' => $employee->public_id,
            'leave_type_id' => $leaveType->id,
            'start_date' => self::DATE,
            'end_date' => self::DATE,
        ])->assertStatus(201);

        // Attempt check-in on the same day
        $response = $this->postJson('/api/v1/attendances/check-in', [
            'employee_id' => $employee->public_id,
            'check_in' => self::DATE.'T09:00:00-06:00',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrorFor('check_in');
    }

    // ── Validation ────────────────────────────────────────────────────────────

    #[Test]
    public function rejects_proportional_hours_leave_without_time_mode(): void
    {
        $employee = $this->makeEmployee();
        $leaveType = LeaveType::where('code', LeaveType::PERMISSION_HOURS)->first();

        $response = $this->postJson('/api/v1/leaves', [
            'employee_id' => $employee->public_id,
            'leave_type_id' => $leaveType->id,
            'start_date' => self::DATE,
            'end_date' => self::DATE,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrorFor('time_mode');
    }

    #[Test]
    public function rejects_scheduled_mode_without_end_time(): void
    {
        $employee = $this->makeEmployee();
        $leaveType = LeaveType::where('code', LeaveType::PERMISSION_HOURS)->first();

        $response = $this->postJson('/api/v1/leaves', [
            'employee_id' => $employee->public_id,
            'leave_type_id' => $leaveType->id,
            'start_date' => self::DATE,
            'end_date' => self::DATE,
            'time_mode' => 'SCHEDULED',
            'scheduled_start_time' => '14:00',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrorFor('scheduled_end_time');
    }

    #[Test]
    public function rejects_proportional_hours_leave_spanning_multiple_days(): void
    {
        $employee = $this->makeEmployee();
        $leaveType = LeaveType::where('code', LeaveType::PERMISSION_HOURS)->first();

        $response = $this->postJson('/api/v1/leaves', [
            'employee_id' => $employee->public_id,
            'leave_type_id' => $leaveType->id,
            'start_date' => '2026-04-09',
            'end_date' => '2026-04-10',
            'time_mode' => 'SCHEDULED',
            'scheduled_start_time' => '14:00',
            'scheduled_end_time' => '16:00',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrorFor('end_date');
    }

    // ── Guard: existing worked attendance ────────────────────────────────────

    #[Test]
    public function rejects_leave_if_employee_already_has_worked_attendance(): void
    {
        $employee = $this->makeEmployee();
        $leaveType = LeaveType::where('code', LeaveType::MEDICAL)->first();

        // Pre-existing WORKED attendance (employee already checked in)
        Attendance::create([
            'employee_id' => $employee->id,
            'date' => self::DATE,
            'day_status' => DayStatus::WORKED,
            'check_in' => now(),
        ]);

        $response = $this->postJson('/api/v1/leaves', [
            'employee_id' => $employee->public_id,
            'leave_type_id' => $leaveType->id,
            'start_date' => self::DATE,
            'end_date' => self::DATE,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrorFor('start_date');
    }

    #[Test]
    public function rejects_leave_for_multi_day_range_with_one_worked_attendance(): void
    {
        $employee = $this->makeEmployee();
        $leaveType = LeaveType::where('code', LeaveType::MEDICAL)->first();

        Attendance::create([
            'employee_id' => $employee->id,
            'date' => '2026-04-10',
            'day_status' => DayStatus::WORKED,
            'check_in' => now(),
        ]);

        $response = $this->postJson('/api/v1/leaves', [
            'employee_id' => $employee->public_id,
            'leave_type_id' => $leaveType->id,
            'start_date' => '2026-04-09',
            'end_date' => '2026-04-11',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrorFor('start_date');
    }

    // ── Validation: time ordering ─────────────────────────────────────────────

    #[Test]
    public function rejects_scheduled_end_time_before_start_time(): void
    {
        $employee = $this->makeEmployee();
        $leaveType = LeaveType::where('code', LeaveType::PERMISSION_HOURS)->first();

        $response = $this->postJson('/api/v1/leaves', [
            'employee_id' => $employee->public_id,
            'leave_type_id' => $leaveType->id,
            'start_date' => self::DATE,
            'end_date' => self::DATE,
            'time_mode' => 'SCHEDULED',
            'scheduled_start_time' => '16:00',
            'scheduled_end_time' => '14:00',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrorFor('scheduled_end_time');
    }

    // ── Auth ──────────────────────────────────────────────────────────────────

    #[Test]
    public function rejects_unauthenticated_request(): void
    {
        auth()->forgetGuards();

        $this->postJson('/api/v1/leaves', [
            'employee_id' => 'any-id',
            'leave_type_id' => 1,
            'start_date' => self::DATE,
            'end_date' => self::DATE,
        ])->assertStatus(401);
    }

    #[Test]
    public function rejects_request_without_leaves_register_direct_permission(): void
    {
        $userWithoutPermission = User::factory()->create();
        Passport::actingAs($userWithoutPermission);

        $this->postJson('/api/v1/leaves', [
            'employee_id' => 'any-id',
            'leave_type_id' => 1,
            'start_date' => self::DATE,
            'end_date' => self::DATE,
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
}
