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
 * Feature tests for GET /api/v1/attendances/{id}/overtime-preview
 *
 * The preview must never persist anything — only compute what WOULD be paid.
 */
class OvertimeValuationPreviewApiTest extends TestCase
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

    private function employeeWithWage(string $hourlyRate): Employee
    {
        $employee = Employee::factory()->create();
        WageHistory::factory()->create([
            'employee_id' => $employee->id,
            'hourly_rate' => $hourlyRate,
            'effective_from' => '2026-01-01',
            'effective_to' => null,
        ]);

        return $employee;
    }

    #[Test]
    public function previews_agreed_rate_amount_without_persisting(): void
    {
        $attendance = Attendance::factory()->withOvertime(30)->create();

        $response = $this->getJson(
            "/api/v1/attendances/{$attendance->public_id}/overtime-preview?valuation_method=AGREED_RATE&agreed_rate=90"
        );

        $response->assertOk()
            ->assertJsonPath('data.valuation_method', 'AGREED_RATE')
            ->assertJsonPath('data.rate_applied', 90)
            ->assertJsonPath('data.amount', 45);

        $attendance->refresh();
        $this->assertNull($attendance->overtime_authorized_at);
        $this->assertNull($attendance->overtime_amount);
    }

    #[Test]
    public function previews_salary_factor_amount(): void
    {
        $employee = $this->employeeWithWage('120.00');
        $attendance = Attendance::factory()->withOvertime(60)->create([
            'employee_id' => $employee->id,
            'date' => '2026-02-23',
        ]);

        $response = $this->getJson(
            "/api/v1/attendances/{$attendance->public_id}/overtime-preview?valuation_method=SALARY_FACTOR&agreed_factor=1.5"
        );

        $response->assertOk()
            ->assertJsonPath('data.rate_applied', 1.5)
            ->assertJsonPath('data.amount', 180);
    }

    #[Test]
    public function previews_lft_proportional_amount_with_resolved_tier(): void
    {
        $employee = $this->employeeWithWage('120.00');
        OvertimeLftTier::insert([
            ['public_id' => '01PREVA0000000000000000A', 'factor' => '2.00', 'up_to_hours' => null, 'sort_order' => 1, 'created_at' => now(), 'updated_at' => now()],
        ]);
        $attendance = Attendance::factory()->withOvertime(60)->create([
            'employee_id' => $employee->id,
            'date' => '2026-02-23',
        ]);

        $response = $this->getJson(
            "/api/v1/attendances/{$attendance->public_id}/overtime-preview?valuation_method=LFT_PROPORTIONAL"
        );

        $response->assertOk()
            ->assertJsonPath('data.rate_applied', 2)
            ->assertJsonPath('data.amount', 240)
            ->assertJsonPath('data.accumulated_hours', 0);
    }

    #[Test]
    public function returns_422_when_lft_has_no_tier_configured(): void
    {
        $attendance = Attendance::factory()->withOvertime(30)->create();

        $this->getJson("/api/v1/attendances/{$attendance->public_id}/overtime-preview?valuation_method=LFT_PROPORTIONAL")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['valuation_method']);
    }

    #[Test]
    public function returns_422_when_agreed_rate_missing(): void
    {
        $attendance = Attendance::factory()->withOvertime(30)->create();

        $this->getJson("/api/v1/attendances/{$attendance->public_id}/overtime-preview?valuation_method=AGREED_RATE")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['agreed_rate']);
    }

    #[Test]
    public function returns_404_for_unknown_attendance(): void
    {
        $this->getJson('/api/v1/attendances/nonexistent-id/overtime-preview?valuation_method=AGREED_RATE&agreed_rate=90')
            ->assertStatus(404);
    }

    #[Test]
    public function returns_401_when_unauthenticated(): void
    {
        auth()->forgetGuards();
        $attendance = Attendance::factory()->withOvertime(30)->create();

        $this->getJson("/api/v1/attendances/{$attendance->public_id}/overtime-preview?valuation_method=AGREED_RATE&agreed_rate=90")
            ->assertStatus(401);
    }
}
