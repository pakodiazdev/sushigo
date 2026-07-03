<?php

namespace Tests\Feature\Overtime;

use App\Models\Employee;
use App\Models\OvertimePayConfig;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class OvertimePayConfigTest extends TestCase
{
    use RefreshDatabase;

    protected Employee $employee;

    protected function setUp(): void
    {
        parent::setUp();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        Permission::create(['name' => 'employees.view', 'guard_name' => 'api']);
        Permission::create(['name' => 'employees.update', 'guard_name' => 'api']);
        $admin = Role::create(['name' => 'admin', 'guard_name' => 'api']);
        $admin->givePermissionTo(['employees.view', 'employees.update']);

        foreach (Employee::POSITION_ROLES as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);
        }

        $this->employee = Employee::factory()->create();
    }

    private function adminUser(): User
    {
        $user = User::factory()->create();
        $user->assignRole('admin');

        return $user;
    }

    // ── GET /api/v1/employees/{id}/overtime-config ─────────────────────────────

    #[Test]
    public function admin_can_get_empty_overtime_config_history(): void
    {
        Passport::actingAs($this->adminUser());

        $this->getJson("/api/v1/employees/{$this->employee->public_id}/overtime-config")
            ->assertOk()
            ->assertJsonPath('data', []);
    }

    #[Test]
    public function admin_can_get_overtime_config_history(): void
    {
        Passport::actingAs($this->adminUser());

        OvertimePayConfig::create([
            'public_id' => '01CFGTEST01234567890123',
            'employee_id' => $this->employee->id,
            'valuation_method' => 'LFT_PROPORTIONAL',
            'lft_factor' => '2.00',
            'hourly_rate' => null,
            'effective_from' => '2026-01-01',
            'effective_to' => null,
        ]);

        $this->getJson("/api/v1/employees/{$this->employee->public_id}/overtime-config")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.valuation_method', 'LFT_PROPORTIONAL')
            ->assertJsonPath('data.0.lft_factor', 2)
            ->assertJsonPath('data.0.hourly_rate', null)
            ->assertJsonPath('data.0.effective_from', '2026-01-01')
            ->assertJsonPath('data.0.effective_to', null);
    }

    #[Test]
    public function get_overtime_config_requires_authentication(): void
    {
        $this->getJson("/api/v1/employees/{$this->employee->public_id}/overtime-config")
            ->assertUnauthorized();
    }

    #[Test]
    public function get_overtime_config_requires_employees_view_permission(): void
    {
        $user = User::factory()->create();
        Passport::actingAs($user);

        $this->getJson("/api/v1/employees/{$this->employee->public_id}/overtime-config")
            ->assertForbidden();
    }

    // ── POST /api/v1/employees/{id}/overtime-config ────────────────────────────

    #[Test]
    public function admin_can_set_lft_proportional_config(): void
    {
        Passport::actingAs($this->adminUser());

        $payload = [
            'valuation_method' => 'LFT_PROPORTIONAL',
            'lft_factor' => 2.00,
            'effective_from' => '2026-05-01',
        ];

        $this->postJson("/api/v1/employees/{$this->employee->public_id}/overtime-config", $payload)
            ->assertCreated()
            ->assertJsonPath('data.valuation_method', 'LFT_PROPORTIONAL')
            ->assertJsonPath('data.lft_factor', 2)
            ->assertJsonPath('data.hourly_rate', null)
            ->assertJsonPath('data.effective_from', '2026-05-01')
            ->assertJsonPath('data.effective_to', null);

        $this->assertDatabaseHas('overtime_pay_configs', [
            'employee_id' => $this->employee->id,
            'valuation_method' => 'LFT_PROPORTIONAL',
            'effective_from' => '2026-05-01',
            'effective_to' => null,
        ]);
    }

    #[Test]
    public function admin_can_set_agreed_rate_config(): void
    {
        Passport::actingAs($this->adminUser());

        $payload = [
            'valuation_method' => 'AGREED_RATE',
            'hourly_rate' => 85.50,
            'effective_from' => '2026-05-01',
        ];

        $this->postJson("/api/v1/employees/{$this->employee->public_id}/overtime-config", $payload)
            ->assertCreated()
            ->assertJsonPath('data.valuation_method', 'AGREED_RATE')
            ->assertJsonPath('data.hourly_rate', 85.5)
            ->assertJsonPath('data.lft_factor', null);
    }

    #[Test]
    public function setting_new_config_auto_closes_previous_open_config(): void
    {
        Passport::actingAs($this->adminUser());

        $previousConfig = OvertimePayConfig::create([
            'public_id' => '01CFGTEST01234567890125',
            'employee_id' => $this->employee->id,
            'valuation_method' => 'LFT_PROPORTIONAL',
            'lft_factor' => '2.00',
            'hourly_rate' => null,
            'effective_from' => '2026-01-01',
            'effective_to' => null,
        ]);

        $this->postJson("/api/v1/employees/{$this->employee->public_id}/overtime-config", [
            'valuation_method' => 'AGREED_RATE',
            'hourly_rate' => 90.00,
            'effective_from' => '2026-05-01',
        ])->assertCreated();

        $this->assertDatabaseHas('overtime_pay_configs', [
            'id' => $previousConfig->id,
            'effective_to' => '2026-04-30',
        ]);
    }

    #[Test]
    public function setting_with_earlier_date_deletes_future_open_configs(): void
    {
        Passport::actingAs($this->adminUser());

        $futureConfig = OvertimePayConfig::create([
            'public_id' => '01CFGTEST01234567890126',
            'employee_id' => $this->employee->id,
            'valuation_method' => 'LFT_PROPORTIONAL',
            'lft_factor' => '2.00',
            'hourly_rate' => null,
            'effective_from' => '2026-06-01',
            'effective_to' => null,
        ]);

        $this->postJson("/api/v1/employees/{$this->employee->public_id}/overtime-config", [
            'valuation_method' => 'AGREED_RATE',
            'hourly_rate' => 90.00,
            'effective_from' => '2026-05-01',
        ])->assertCreated();

        $this->assertDatabaseMissing('overtime_pay_configs', ['id' => $futureConfig->id]);

        $this->assertDatabaseHas('overtime_pay_configs', [
            'employee_id' => $this->employee->id,
            'effective_from' => '2026-05-01',
            'effective_to' => null,
        ]);
    }

    #[Test]
    public function response_status_field_matches_http_201(): void
    {
        Passport::actingAs($this->adminUser());

        $this->postJson("/api/v1/employees/{$this->employee->public_id}/overtime-config", [
            'valuation_method' => 'LFT_PROPORTIONAL',
            'lft_factor' => 2.00,
            'effective_from' => '2026-05-01',
        ])
            ->assertCreated()
            ->assertJsonPath('status', 201);
    }

    #[Test]
    public function set_overtime_config_requires_authentication(): void
    {
        $this->postJson("/api/v1/employees/{$this->employee->public_id}/overtime-config", [
            'valuation_method' => 'LFT_PROPORTIONAL',
            'lft_factor' => 2.00,
            'effective_from' => '2026-05-01',
        ])->assertUnauthorized();
    }

    #[Test]
    public function set_overtime_config_requires_employees_update_permission(): void
    {
        $user = User::factory()->create();
        Passport::actingAs($user);

        $this->postJson("/api/v1/employees/{$this->employee->public_id}/overtime-config", [
            'valuation_method' => 'LFT_PROPORTIONAL',
            'lft_factor' => 2.00,
            'effective_from' => '2026-05-01',
        ])->assertForbidden();
    }

    #[Test]
    public function set_overtime_config_rejects_missing_fields(): void
    {
        Passport::actingAs($this->adminUser());

        $this->postJson("/api/v1/employees/{$this->employee->public_id}/overtime-config", [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['valuation_method', 'effective_from']);
    }

    #[Test]
    public function set_overtime_config_requires_lft_factor_when_lft_proportional(): void
    {
        Passport::actingAs($this->adminUser());

        $this->postJson("/api/v1/employees/{$this->employee->public_id}/overtime-config", [
            'valuation_method' => 'LFT_PROPORTIONAL',
            'effective_from' => '2026-05-01',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['lft_factor']);
    }

    #[Test]
    public function set_overtime_config_requires_hourly_rate_when_agreed_rate(): void
    {
        Passport::actingAs($this->adminUser());

        $this->postJson("/api/v1/employees/{$this->employee->public_id}/overtime-config", [
            'valuation_method' => 'AGREED_RATE',
            'effective_from' => '2026-05-01',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['hourly_rate']);
    }

    #[Test]
    public function set_overtime_config_rejects_invalid_valuation_method(): void
    {
        Passport::actingAs($this->adminUser());

        $this->postJson("/api/v1/employees/{$this->employee->public_id}/overtime-config", [
            'valuation_method' => 'INVALID_METHOD',
            'effective_from' => '2026-05-01',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['valuation_method']);
    }
}
