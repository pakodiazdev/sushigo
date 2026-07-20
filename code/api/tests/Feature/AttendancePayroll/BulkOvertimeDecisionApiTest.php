<?php

namespace Tests\Feature\AttendancePayroll;

use App\Models\Attendance;
use App\Models\Employee;
use App\Models\OvertimeLftTier;
use App\Models\User;
use App\Models\WageHistory;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

/**
 * Feature tests for POST /api/v1/attendances/overtime-decisions/bulk
 *
 * Covers:
 *   - Full batch success (authorize + reject)
 *   - Partial success when one attendance was already decided
 *   - LFT_PROPORTIONAL across multiple employees in the same batch
 *   - Validation errors
 *   - Unauthorized / unauthenticated access
 */
class BulkOvertimeDecisionApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;

    protected User $managerUser;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow(Carbon::parse('2026-02-23 23:59:00'));

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        Permission::create(['name' => 'attendances.create', 'guard_name' => 'api']);
        $adminRole = Role::create(['name' => 'admin', 'guard_name' => 'api']);
        $adminRole->givePermissionTo('attendances.create');
        $managerRole = Role::create(['name' => 'manager', 'guard_name' => 'api']);
        $managerRole->givePermissionTo('attendances.create');

        Role::firstOrCreate(['name' => 'employee', 'guard_name' => 'api']);
        Role::firstOrCreate(['name' => 'employee-manager', 'guard_name' => 'api']);
        foreach (Employee::POSITION_ROLES as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);
        }

        $this->adminUser = User::factory()->create();
        $this->adminUser->assignRole('admin');

        $this->managerUser = User::factory()->create();
        $this->managerUser->assignRole('manager');

        Passport::actingAs($this->adminUser);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow(null);
        parent::tearDown();
    }

    // #region Happy path

    #[Test]
    public function authorizes_every_attendance_in_the_batch(): void
    {
        $a1 = Attendance::factory()->withOvertime(30)->create(['date' => '2026-02-23']);
        $a2 = Attendance::factory()->withOvertime(45)->create(['date' => '2026-02-23']);

        $response = $this->postJson('/api/v1/attendances/overtime-decisions/bulk', [
            'attendance_ids' => [$a1->public_id, $a2->public_id],
            'authorize' => true,
            'valuation_method' => 'AGREED_RATE',
            'agreed_rate' => 90,
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.results.0.attendance_id', $a1->public_id)
            ->assertJsonPath('data.results.0.success', true)
            ->assertJsonPath('data.results.0.attendance.overtime_authorized', true)
            ->assertJsonPath('data.results.0.error', null)
            ->assertJsonPath('data.results.1.attendance_id', $a2->public_id)
            ->assertJsonPath('data.results.1.success', true)
            ->assertJsonPath('data.results.1.attendance.overtime_authorized', true)
            ->assertJsonPath('data.results.1.error', null);

        $a1->refresh();
        $a2->refresh();
        $this->assertTrue($a1->overtime_authorized);
        $this->assertTrue($a2->overtime_authorized);
        $this->assertEquals($this->adminUser->id, $a1->overtime_authorized_by);
    }

    #[Test]
    public function rejects_every_attendance_in_the_batch(): void
    {
        $a1 = Attendance::factory()->withOvertime(30)->create(['date' => '2026-02-23']);
        $a2 = Attendance::factory()->withOvertime(45)->create(['date' => '2026-02-23']);

        $response = $this->postJson('/api/v1/attendances/overtime-decisions/bulk', [
            'attendance_ids' => [$a1->public_id, $a2->public_id],
            'authorize' => false,
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.results.0.success', true)
            ->assertJsonPath('data.results.1.success', true);

        $a1->refresh();
        $a2->refresh();
        $this->assertFalse($a1->overtime_authorized);
        $this->assertFalse($a2->overtime_authorized);
    }

    #[Test]
    public function each_result_includes_the_employee_name_for_success_and_failure(): void
    {
        $employee = Employee::factory()->create(['first_name' => 'Ana', 'last_name' => 'López']);
        $attendance = Attendance::factory()->withOvertime(30)->create([
            'employee_id' => $employee->id,
            'date' => '2026-02-23',
        ]);

        $response = $this->postJson('/api/v1/attendances/overtime-decisions/bulk', [
            'attendance_ids' => [$attendance->public_id],
            'authorize' => false,
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.results.0.employee_name', 'Ana López');
    }

    // #endregion

    // #region Partial success

    #[Test]
    public function partial_success_when_one_attendance_was_already_decided(): void
    {
        $decided = Attendance::factory()->withOvertime(40)->create([
            'date' => '2026-02-23',
            'overtime_authorized' => true,
            'overtime_authorized_by' => $this->adminUser->id,
            'overtime_authorized_at' => Carbon::now()->utc(),
        ]);
        $pending = Attendance::factory()->withOvertime(30)->create(['date' => '2026-02-23']);

        $response = $this->postJson('/api/v1/attendances/overtime-decisions/bulk', [
            'attendance_ids' => [$decided->public_id, $pending->public_id],
            'authorize' => true,
            'valuation_method' => 'AGREED_RATE',
            'agreed_rate' => 90,
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.results.0.attendance_id', $decided->public_id)
            ->assertJsonPath('data.results.0.success', false)
            ->assertJsonPath('data.results.0.attendance', null)
            ->assertJsonPath('data.results.1.attendance_id', $pending->public_id)
            ->assertJsonPath('data.results.1.success', true);

        $this->assertNotNull($response->json('data.results.0.error'));

        $pending->refresh();
        $this->assertTrue($pending->overtime_authorized);
    }

    // #endregion

    // #region LFT proportional across multiple employees

    #[Test]
    public function lft_proportional_resolves_independently_per_employee_in_the_same_batch(): void
    {
        OvertimeLftTier::insert([
            ['public_id' => '01BLKA', 'factor' => '2.00', 'up_to_hours' => '9.00', 'sort_order' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['public_id' => '01BLKB', 'factor' => '3.00', 'up_to_hours' => null, 'sort_order' => 2, 'created_at' => now(), 'updated_at' => now()],
        ]);

        $employeeA = Employee::factory()->create();
        WageHistory::factory()->create([
            'employee_id' => $employeeA->id,
            'hourly_rate' => '120.00',
            'effective_from' => '2026-01-01',
            'effective_to' => null,
        ]);
        $attendanceA = Attendance::factory()->withOvertime(120)->create([
            'employee_id' => $employeeA->id,
            'date' => '2026-02-23',
        ]);

        $employeeB = Employee::factory()->create();
        WageHistory::factory()->create([
            'employee_id' => $employeeB->id,
            'hourly_rate' => '120.00',
            'effective_from' => '2026-01-01',
            'effective_to' => null,
        ]);
        $attendanceB = Attendance::factory()->withOvertime(60)->create([
            'employee_id' => $employeeB->id,
            'date' => '2026-02-23',
        ]);

        $response = $this->postJson('/api/v1/attendances/overtime-decisions/bulk', [
            'attendance_ids' => [$attendanceA->public_id, $attendanceB->public_id],
            'authorize' => true,
            'valuation_method' => 'LFT_PROPORTIONAL',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.results.0.success', true)
            ->assertJsonPath('data.results.0.attendance.overtime_rate_applied', 2)
            ->assertJsonPath('data.results.1.success', true)
            ->assertJsonPath('data.results.1.attendance.overtime_rate_applied', 2);
    }

    // #endregion

    // #region Validation errors — 422

    #[Test]
    public function returns_422_when_attendance_ids_is_missing(): void
    {
        $this->postJson('/api/v1/attendances/overtime-decisions/bulk', [
            'authorize' => false,
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['attendance_ids']);
    }

    #[Test]
    public function returns_422_when_attendance_ids_is_empty(): void
    {
        $this->postJson('/api/v1/attendances/overtime-decisions/bulk', [
            'attendance_ids' => [],
            'authorize' => false,
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['attendance_ids']);
    }

    #[Test]
    public function returns_422_instead_of_500_when_attendance_ids_is_not_an_array(): void
    {
        $this->postJson('/api/v1/attendances/overtime-decisions/bulk', [
            'attendance_ids' => 'not-an-array',
            'authorize' => false,
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['attendance_ids']);
    }

    #[Test]
    public function returns_422_when_an_attendance_id_does_not_exist(): void
    {
        $attendance = Attendance::factory()->withOvertime(30)->create();

        $this->postJson('/api/v1/attendances/overtime-decisions/bulk', [
            'attendance_ids' => [$attendance->public_id, 'nonexistent-id'],
            'authorize' => false,
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['attendance_ids.1']);
    }

    #[Test]
    public function returns_422_when_attendance_ids_are_not_distinct(): void
    {
        $attendance = Attendance::factory()->withOvertime(30)->create();

        $this->postJson('/api/v1/attendances/overtime-decisions/bulk', [
            'attendance_ids' => [$attendance->public_id, $attendance->public_id],
            'authorize' => false,
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['attendance_ids.1']);
    }

    #[Test]
    public function returns_422_when_authorize_field_is_missing(): void
    {
        $attendance = Attendance::factory()->withOvertime(30)->create();

        $this->postJson('/api/v1/attendances/overtime-decisions/bulk', [
            'attendance_ids' => [$attendance->public_id],
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['authorize']);
    }

    #[Test]
    public function returns_422_when_valuation_method_missing_while_authorizing(): void
    {
        $attendance = Attendance::factory()->withOvertime(30)->create();

        $this->postJson('/api/v1/attendances/overtime-decisions/bulk', [
            'attendance_ids' => [$attendance->public_id],
            'authorize' => true,
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['valuation_method']);
    }

    // #endregion

    // #region Past-day reason requirement (mirrors the single-decision endpoint)

    #[Test]
    public function returns_422_when_admin_decides_a_past_day_attendance_without_a_reason(): void
    {
        $attendance = Attendance::factory()->withOvertime(30)->create(['date' => '2026-02-20']);

        $this->postJson('/api/v1/attendances/overtime-decisions/bulk', [
            'attendance_ids' => [$attendance->public_id],
            'authorize' => false,
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['reason']);
    }

    #[Test]
    public function returns_422_when_batch_mixes_today_and_past_day_attendances_without_a_reason(): void
    {
        $today = Attendance::factory()->withOvertime(30)->create(['date' => '2026-02-23']);
        $pastDay = Attendance::factory()->withOvertime(30)->create(['date' => '2026-02-20']);

        $this->postJson('/api/v1/attendances/overtime-decisions/bulk', [
            'attendance_ids' => [$today->public_id, $pastDay->public_id],
            'authorize' => false,
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['reason']);
    }

    #[Test]
    public function admin_can_decide_a_past_day_attendance_when_a_reason_is_supplied(): void
    {
        $attendance = Attendance::factory()->withOvertime(30)->create(['date' => '2026-02-20']);

        $this->postJson('/api/v1/attendances/overtime-decisions/bulk', [
            'attendance_ids' => [$attendance->public_id],
            'authorize' => false,
            'reason' => 'Autorización retroactiva aprobada por gerencia',
        ])->assertStatus(200)
            ->assertJsonPath('data.results.0.success', true);
    }

    #[Test]
    public function admin_does_not_need_a_reason_when_every_attendance_is_from_today(): void
    {
        $attendance = Attendance::factory()->withOvertime(30)->create(['date' => '2026-02-23']);

        $this->postJson('/api/v1/attendances/overtime-decisions/bulk', [
            'attendance_ids' => [$attendance->public_id],
            'authorize' => false,
        ])->assertStatus(200)
            ->assertJsonPath('data.results.0.success', true);
    }

    // #endregion

    // #region 401 / 403

    #[Test]
    public function returns_401_when_unauthenticated(): void
    {
        auth()->forgetGuards();

        $attendance = Attendance::factory()->withOvertime(30)->create();

        $this->postJson('/api/v1/attendances/overtime-decisions/bulk', [
            'attendance_ids' => [$attendance->public_id],
            'authorize' => false,
        ])->assertStatus(401);
    }

    #[Test]
    public function returns_403_when_a_manager_tries_to_decide_a_past_day_attendance(): void
    {
        Passport::actingAs($this->managerUser);

        $attendance = Attendance::factory()->withOvertime(30)->create(['date' => '2026-02-20']);

        $this->postJson('/api/v1/attendances/overtime-decisions/bulk', [
            'attendance_ids' => [$attendance->public_id],
            'authorize' => false,
        ])->assertStatus(403);
    }

    // #endregion
}
