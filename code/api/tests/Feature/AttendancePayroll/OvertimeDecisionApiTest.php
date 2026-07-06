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
            ['authorize' => true, 'valuation_method' => 'AGREED_RATE', 'agreed_rate' => 90],
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
            ['authorize' => true, 'valuation_method' => 'AGREED_RATE', 'agreed_rate' => 90],
        )->assertStatus(200);

        $attendance->refresh();
        $this->assertEquals($this->user->id, $attendance->overtime_authorized_by);
    }

    // #endregion

    // #region Valuation — LFT proportional

    #[Test]
    public function authorize_with_lft_proportional_resolves_tier_and_calculates_amount(): void
    {
        $employee = Employee::factory()->create();
        WageHistory::factory()->create([
            'employee_id' => $employee->id,
            'hourly_rate' => '120.00',
            'effective_from' => '2026-01-01',
            'effective_to' => null,
        ]);

        OvertimeLftTier::insert([
            ['public_id' => '01LFTA', 'factor' => '2.00', 'up_to_hours' => '9.00', 'sort_order' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['public_id' => '01LFTB', 'factor' => '3.00', 'up_to_hours' => null, 'sort_order' => 2, 'created_at' => now(), 'updated_at' => now()],
        ]);

        $attendance = Attendance::factory()->withOvertime(120)->create([
            'employee_id' => $employee->id,
            'date' => '2026-02-23',
        ]);

        $response = $this->patchJson(
            "/api/v1/attendances/{$attendance->public_id}/overtime-decision",
            ['authorize' => true, 'valuation_method' => 'LFT_PROPORTIONAL'],
        );

        $response->assertStatus(200)
            ->assertJsonPath('data.overtime_valuation_method', 'LFT_PROPORTIONAL')
            ->assertJsonPath('data.overtime_rate_applied', 2)
            ->assertJsonPath('data.overtime_amount', 480);
    }

    #[Test]
    public function lft_tier_resolution_uses_previously_authorized_weekly_minutes(): void
    {
        $employee = Employee::factory()->create();
        WageHistory::factory()->create([
            'employee_id' => $employee->id,
            'hourly_rate' => '120.00',
            'effective_from' => '2026-01-01',
            'effective_to' => null,
        ]);

        OvertimeLftTier::insert([
            ['public_id' => '01LFTC', 'factor' => '2.00', 'up_to_hours' => '9.00', 'sort_order' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['public_id' => '01LFTD', 'factor' => '3.00', 'up_to_hours' => null, 'sort_order' => 2, 'created_at' => now(), 'updated_at' => now()],
        ]);

        // 10 hours already authorized earlier this same week (week of 2026-02-23, Monday–Sunday)
        Attendance::factory()->withOvertime(600)->create([
            'employee_id' => $employee->id,
            'date' => '2026-02-24',
            'overtime_authorized' => true,
        ]);

        $attendance = Attendance::factory()->withOvertime(60)->create([
            'employee_id' => $employee->id,
            'date' => '2026-02-25',
        ]);

        $response = $this->patchJson(
            "/api/v1/attendances/{$attendance->public_id}/overtime-decision",
            ['authorize' => true, 'valuation_method' => 'LFT_PROPORTIONAL'],
        );

        // Accumulated 10h already exceeds the 9h tier cap, so the second tier (factor 3) applies.
        $response->assertStatus(200)
            ->assertJsonPath('data.overtime_rate_applied', 3)
            ->assertJsonPath('data.overtime_amount', 360);
    }

    #[Test]
    public function lft_proportional_ignores_agreed_rate_field_if_present(): void
    {
        $employee = Employee::factory()->create();
        WageHistory::factory()->create([
            'employee_id' => $employee->id,
            'hourly_rate' => '120.00',
            'effective_from' => '2026-01-01',
            'effective_to' => null,
        ]);
        OvertimeLftTier::insert([
            ['public_id' => '01LFTE', 'factor' => '2.00', 'up_to_hours' => null, 'sort_order' => 1, 'created_at' => now(), 'updated_at' => now()],
        ]);

        $attendance = Attendance::factory()->withOvertime(60)->create([
            'employee_id' => $employee->id,
            'date' => '2026-02-23',
        ]);

        $response = $this->patchJson(
            "/api/v1/attendances/{$attendance->public_id}/overtime-decision",
            ['authorize' => true, 'valuation_method' => 'LFT_PROPORTIONAL', 'agreed_rate' => 999],
        );

        $response->assertStatus(200)
            ->assertJsonPath('data.overtime_rate_applied', 2);
    }

    #[Test]
    public function returns_422_when_no_lft_tier_configured(): void
    {
        $attendance = Attendance::factory()->withOvertime(30)->create();

        $this->patchJson(
            "/api/v1/attendances/{$attendance->public_id}/overtime-decision",
            ['authorize' => true, 'valuation_method' => 'LFT_PROPORTIONAL'],
        )->assertStatus(422)
            ->assertJsonValidationErrors(['valuation_method']);
    }

    // #endregion

    // #region Valuation — agreed rate

    #[Test]
    public function authorize_with_agreed_rate_uses_the_given_rate_and_computes_amount(): void
    {
        $attendance = Attendance::factory()->withOvertime(30)->create();

        $response = $this->patchJson(
            "/api/v1/attendances/{$attendance->public_id}/overtime-decision",
            ['authorize' => true, 'valuation_method' => 'AGREED_RATE', 'agreed_rate' => 90],
        );

        $response->assertStatus(200)
            ->assertJsonPath('data.overtime_valuation_method', 'AGREED_RATE')
            ->assertJsonPath('data.overtime_rate_applied', 90)
            ->assertJsonPath('data.overtime_amount', 45);
    }

    #[Test]
    public function returns_422_when_valuation_method_missing_while_authorizing(): void
    {
        $attendance = Attendance::factory()->withOvertime(30)->create();

        $this->patchJson(
            "/api/v1/attendances/{$attendance->public_id}/overtime-decision",
            ['authorize' => true],
        )->assertStatus(422)
            ->assertJsonValidationErrors(['valuation_method']);
    }

    #[Test]
    public function returns_422_when_agreed_rate_missing_for_agreed_rate_method(): void
    {
        $attendance = Attendance::factory()->withOvertime(30)->create();

        $this->patchJson(
            "/api/v1/attendances/{$attendance->public_id}/overtime-decision",
            ['authorize' => true, 'valuation_method' => 'AGREED_RATE'],
        )->assertStatus(422)
            ->assertJsonValidationErrors(['agreed_rate']);
    }

    // #endregion

    // #region Valuation — salary factor

    #[Test]
    public function authorize_with_salary_factor_uses_the_given_factor_and_computes_amount(): void
    {
        $employee = Employee::factory()->create();
        WageHistory::factory()->create([
            'employee_id' => $employee->id,
            'hourly_rate' => '120.00',
            'effective_from' => '2026-01-01',
            'effective_to' => null,
        ]);
        $attendance = Attendance::factory()->withOvertime(60)->create([
            'employee_id' => $employee->id,
            'date' => '2026-02-23',
        ]);

        $response = $this->patchJson(
            "/api/v1/attendances/{$attendance->public_id}/overtime-decision",
            ['authorize' => true, 'valuation_method' => 'SALARY_FACTOR', 'agreed_factor' => 1.5],
        );

        // minuteRate = 120/60 = 2; amount = 2 * 1.5 * 60 = 180
        $response->assertStatus(200)
            ->assertJsonPath('data.overtime_valuation_method', 'SALARY_FACTOR')
            ->assertJsonPath('data.overtime_rate_applied', 1.5)
            ->assertJsonPath('data.overtime_amount', 180);
    }

    #[Test]
    public function returns_422_when_agreed_factor_missing_for_salary_factor_method(): void
    {
        $attendance = Attendance::factory()->withOvertime(30)->create();

        $this->patchJson(
            "/api/v1/attendances/{$attendance->public_id}/overtime-decision",
            ['authorize' => true, 'valuation_method' => 'SALARY_FACTOR'],
        )->assertStatus(422)
            ->assertJsonValidationErrors(['agreed_factor']);
    }

    // #endregion

    #[Test]
    public function reject_does_not_require_valuation_method(): void
    {
        $attendance = Attendance::factory()->withOvertime(30)->create();

        $this->patchJson(
            "/api/v1/attendances/{$attendance->public_id}/overtime-decision",
            ['authorize' => false],
        )->assertStatus(200)
            ->assertJsonPath('data.overtime_valuation_method', null);
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
            ['authorize' => true, 'valuation_method' => 'AGREED_RATE', 'agreed_rate' => 90],
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
            ['authorize' => true, 'valuation_method' => 'AGREED_RATE', 'agreed_rate' => 90],
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
            ['authorize' => true, 'valuation_method' => 'AGREED_RATE', 'agreed_rate' => 90],
        )->assertStatus(404);
    }

    #[Test]
    public function returns_401_when_unauthenticated(): void
    {
        auth()->forgetGuards();

        $attendance = Attendance::factory()->withOvertime(30)->create();

        $this->patchJson(
            "/api/v1/attendances/{$attendance->public_id}/overtime-decision",
            ['authorize' => true, 'valuation_method' => 'AGREED_RATE', 'agreed_rate' => 90],
        )->assertStatus(401);
    }

    // #endregion
}
