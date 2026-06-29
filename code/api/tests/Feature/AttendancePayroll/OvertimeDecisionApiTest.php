<?php

namespace Tests\Feature\AttendancePayroll;

use App\Models\Attendance;
use App\Models\Employee;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

/**
 * Feature tests for PATCH /api/v1/attendances/{id}/overtime-decision
 *
 * Covers:
 *   - Authorize overtime (happy path)
 *   - Reject overtime (happy path)
 *   - 422 when attendance has no overtime
 *   - 422 when decision was already recorded
 *   - 404 when attendance not found
 *   - 401 when unauthenticated
 */
class OvertimeDecisionApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow(Carbon::parse('2026-02-23 23:59:00'));

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        Permission::create(['name' => 'attendances.create', 'guard_name' => 'api']);
        $role = Role::create(['name' => 'admin', 'guard_name' => 'api']);
        $role->givePermissionTo('attendances.create');

        // Position roles required by Employee factory
        Role::firstOrCreate(['name' => 'employee',         'guard_name' => 'api']);
        Role::firstOrCreate(['name' => 'employee-manager', 'guard_name' => 'api']);
        Role::firstOrCreate(['name' => 'manager',          'guard_name' => 'api']);
        foreach (Employee::POSITION_ROLES as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);
        }

        $this->user = User::factory()->create();
        $this->user->assignRole('admin');

        Passport::actingAs($this->user);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow(null);
        parent::tearDown();
    }

    // #region Happy path — authorize

    #[Test]
    public function authorizes_overtime_successfully(): void
    {
        $attendance = Attendance::factory()
            ->withOvertime(45)
            ->create();

        $response = $this->patchJson(
            "/api/v1/attendances/{$attendance->public_id}/overtime-decision",
            ['authorize' => true],
        );

        $response->assertStatus(200)
            ->assertJsonPath('data.overtime_authorized', true)
            ->assertJsonPath('data.requires_overtime_decision', false)
            ->assertJsonPath('data.overtime_minutes', 45);

        $this->assertNotNull($response->json('data.overtime_authorized_at'));

        $attendance->refresh();
        $this->assertTrue($attendance->overtime_authorized);
        $this->assertEquals($this->user->id, $attendance->overtime_authorized_by);
        $this->assertNotNull($attendance->overtime_authorized_at);
    }

    #[Test]
    public function authorized_by_is_the_authenticated_user(): void
    {
        $attendance = Attendance::factory()->withOvertime(30)->create();

        $this->patchJson(
            "/api/v1/attendances/{$attendance->public_id}/overtime-decision",
            ['authorize' => true],
        )->assertStatus(200);

        $attendance->refresh();
        $this->assertEquals($this->user->id, $attendance->overtime_authorized_by);
    }

    // #endregion

    // #region Happy path — reject

    #[Test]
    public function rejects_overtime_successfully(): void
    {
        $attendance = Attendance::factory()
            ->withOvertime(30)
            ->create();

        $response = $this->patchJson(
            "/api/v1/attendances/{$attendance->public_id}/overtime-decision",
            ['authorize' => false],
        );

        $response->assertStatus(200)
            ->assertJsonPath('data.overtime_authorized', false)
            ->assertJsonPath('data.requires_overtime_decision', false)
            ->assertJsonPath('data.overtime_minutes', 30);

        $this->assertNotNull($response->json('data.overtime_authorized_at'));

        $attendance->refresh();
        $this->assertFalse($attendance->overtime_authorized);
        $this->assertNull($attendance->overtime_authorized_by);
        $this->assertNotNull($attendance->overtime_authorized_at);
    }

    // #endregion

    // #region Business rule violations — 422

    #[Test]
    public function returns_422_when_attendance_has_no_overtime(): void
    {
        $attendance = Attendance::factory()
            ->worked()
            ->create(['overtime_minutes' => 0]);

        $response = $this->patchJson(
            "/api/v1/attendances/{$attendance->public_id}/overtime-decision",
            ['authorize' => true],
        );

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['authorize']);
    }

    #[Test]
    public function returns_422_when_decision_already_recorded_as_authorized(): void
    {
        $attendance = Attendance::factory()
            ->withOvertime(40)
            ->create([
                'overtime_authorized' => true,
                'overtime_authorized_by' => $this->user->id,
                'overtime_authorized_at' => Carbon::now()->utc(),
            ]);

        $response = $this->patchJson(
            "/api/v1/attendances/{$attendance->public_id}/overtime-decision",
            ['authorize' => true],
        );

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['authorize']);
    }

    #[Test]
    public function returns_422_when_decision_already_recorded_as_rejected(): void
    {
        $attendance = Attendance::factory()
            ->withOvertime(40)
            ->create([
                'overtime_authorized' => false,
                'overtime_authorized_by' => null,
                'overtime_authorized_at' => Carbon::now()->utc(),
            ]);

        $response = $this->patchJson(
            "/api/v1/attendances/{$attendance->public_id}/overtime-decision",
            ['authorize' => false],
        );

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['authorize']);
    }

    // #endregion

    // #region Validation errors — 422

    #[Test]
    public function returns_422_when_authorize_field_is_missing(): void
    {
        $attendance = Attendance::factory()->withOvertime(30)->create();

        $this->patchJson(
            "/api/v1/attendances/{$attendance->public_id}/overtime-decision",
            [],
        )->assertStatus(422)
            ->assertJsonValidationErrors(['authorize']);
    }

    #[Test]
    public function returns_422_when_authorize_field_is_not_boolean(): void
    {
        $attendance = Attendance::factory()->withOvertime(30)->create();

        $this->patchJson(
            "/api/v1/attendances/{$attendance->public_id}/overtime-decision",
            ['authorize' => 'yes'],
        )->assertStatus(422)
            ->assertJsonValidationErrors(['authorize']);
    }

    // #endregion

    // #region 404 / 401

    #[Test]
    public function returns_404_for_unknown_attendance_id(): void
    {
        $this->patchJson(
            '/api/v1/attendances/nonexistent-id/overtime-decision',
            ['authorize' => true],
        )->assertStatus(404);
    }

    #[Test]
    public function returns_401_when_unauthenticated(): void
    {
        auth()->forgetGuards();

        $attendance = Attendance::factory()->withOvertime(30)->create();

        $this->patchJson(
            "/api/v1/attendances/{$attendance->public_id}/overtime-decision",
            ['authorize' => true],
        )->assertStatus(401);
    }

    // #endregion
}
