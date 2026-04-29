<?php

namespace Tests\Feature\Punctuality;

use App\Models\Employee;
use App\Models\EmployeeBonusConfig;
use App\Models\PunctualityBonusGroup;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class EmployeeBonusConfigTest extends TestCase
{
    use RefreshDatabase;

    protected PunctualityBonusGroup $group;

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

        $this->group = PunctualityBonusGroup::create([
            'public_id' => '01GRPTEST01234567890123',
            'name' => 'Grupo $110',
            'weekly_bonus_amount' => '110.00',
            'working_days_divisor' => 6,
            'is_active' => true,
        ]);

        $this->employee = Employee::factory()->create();
    }

    private function adminUser(): User
    {
        $user = User::factory()->create();
        $user->assignRole('admin');

        return $user;
    }

    // ── GET /api/v1/employees/{id}/bonus-config ────────────────────────────────

    #[Test]
    public function admin_can_get_empty_bonus_config_history(): void
    {
        Passport::actingAs($this->adminUser());

        $this->getJson("/api/v1/employees/{$this->employee->public_id}/bonus-config")
            ->assertOk()
            ->assertJsonPath('data', []);
    }

    #[Test]
    public function admin_can_get_bonus_config_history(): void
    {
        Passport::actingAs($this->adminUser());

        EmployeeBonusConfig::create([
            'public_id' => '01CFGTEST01234567890123',
            'employee_id' => $this->employee->id,
            'punctuality_bonus_group_id' => $this->group->id,
            'effective_from' => '2026-01-01',
            'effective_to' => null,
        ]);

        $this->getJson("/api/v1/employees/{$this->employee->public_id}/bonus-config")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.bonus_group_name', 'Grupo $110')
            ->assertJsonPath('data.0.effective_from', '2026-01-01')
            ->assertJsonPath('data.0.effective_to', null);
    }

    #[Test]
    public function get_bonus_config_returns_daily_bonus_amount(): void
    {
        Passport::actingAs($this->adminUser());

        EmployeeBonusConfig::create([
            'public_id' => '01CFGTEST01234567890124',
            'employee_id' => $this->employee->id,
            'punctuality_bonus_group_id' => $this->group->id,
            'effective_from' => '2026-01-01',
            'effective_to' => null,
        ]);

        $this->getJson("/api/v1/employees/{$this->employee->public_id}/bonus-config")
            ->assertOk()
            ->assertJsonPath('data.0.weekly_bonus_amount', 110)
            ->assertJsonPath('data.0.daily_bonus_amount', 18.33);
    }

    #[Test]
    public function get_bonus_config_requires_authentication(): void
    {
        $this->getJson("/api/v1/employees/{$this->employee->public_id}/bonus-config")
            ->assertUnauthorized();
    }

    #[Test]
    public function get_bonus_config_requires_employees_view_permission(): void
    {
        $user = User::factory()->create();
        Passport::actingAs($user);

        $this->getJson("/api/v1/employees/{$this->employee->public_id}/bonus-config")
            ->assertForbidden();
    }

    // ── POST /api/v1/employees/{id}/bonus-config ───────────────────────────────

    #[Test]
    public function admin_can_assign_bonus_group_to_employee(): void
    {
        Passport::actingAs($this->adminUser());

        $payload = [
            'bonus_group_id' => $this->group->public_id,
            'effective_from' => '2026-05-01',
        ];

        $this->postJson("/api/v1/employees/{$this->employee->public_id}/bonus-config", $payload)
            ->assertCreated()
            ->assertJsonPath('data.bonus_group_name', 'Grupo $110')
            ->assertJsonPath('data.effective_from', '2026-05-01')
            ->assertJsonPath('data.effective_to', null);

        $this->assertDatabaseHas('employee_bonus_configs', [
            'employee_id' => $this->employee->id,
            'punctuality_bonus_group_id' => $this->group->id,
            'effective_from' => '2026-05-01',
            'effective_to' => null,
        ]);
    }

    #[Test]
    public function assigning_new_group_auto_closes_previous_open_config(): void
    {
        Passport::actingAs($this->adminUser());

        $previousConfig = EmployeeBonusConfig::create([
            'public_id' => '01CFGTEST01234567890125',
            'employee_id' => $this->employee->id,
            'punctuality_bonus_group_id' => $this->group->id,
            'effective_from' => '2026-01-01',
            'effective_to' => null,
        ]);

        $secondGroup = PunctualityBonusGroup::create([
            'public_id' => '01GRP2TEST1234567890123',
            'name' => 'Grupo $100',
            'weekly_bonus_amount' => '100.00',
            'working_days_divisor' => 6,
            'is_active' => true,
        ]);

        $this->postJson("/api/v1/employees/{$this->employee->public_id}/bonus-config", [
            'bonus_group_id' => $secondGroup->public_id,
            'effective_from' => '2026-05-01',
        ])->assertCreated();

        $this->assertDatabaseHas('employee_bonus_configs', [
            'id' => $previousConfig->id,
            'effective_to' => '2026-04-30',
        ]);
    }

    #[Test]
    public function assigning_with_earlier_date_deletes_future_open_configs(): void
    {
        Passport::actingAs($this->adminUser());

        // Existing open config starting in the future (June 1)
        $futureConfig = EmployeeBonusConfig::create([
            'public_id' => '01CFGTEST01234567890126',
            'employee_id' => $this->employee->id,
            'punctuality_bonus_group_id' => $this->group->id,
            'effective_from' => '2026-06-01',
            'effective_to' => null,
        ]);

        // Assign with an earlier date (May 1) — future config must be deleted
        $this->postJson("/api/v1/employees/{$this->employee->public_id}/bonus-config", [
            'bonus_group_id' => $this->group->public_id,
            'effective_from' => '2026-05-01',
        ])->assertCreated();

        $this->assertDatabaseMissing('employee_bonus_configs', ['id' => $futureConfig->id]);

        $this->assertDatabaseHas('employee_bonus_configs', [
            'employee_id' => $this->employee->id,
            'effective_from' => '2026-05-01',
            'effective_to' => null,
        ]);
    }

    #[Test]
    public function response_status_field_matches_http_201(): void
    {
        Passport::actingAs($this->adminUser());

        $this->postJson("/api/v1/employees/{$this->employee->public_id}/bonus-config", [
            'bonus_group_id' => $this->group->public_id,
            'effective_from' => '2026-05-01',
        ])
            ->assertCreated()
            ->assertJsonPath('status', 201);
    }

    #[Test]
    public function assign_bonus_config_requires_authentication(): void
    {
        $this->postJson("/api/v1/employees/{$this->employee->public_id}/bonus-config", [
            'bonus_group_id' => $this->group->public_id,
            'effective_from' => '2026-05-01',
        ])->assertUnauthorized();
    }

    #[Test]
    public function assign_bonus_config_requires_employees_update_permission(): void
    {
        $user = User::factory()->create();
        Passport::actingAs($user);

        $this->postJson("/api/v1/employees/{$this->employee->public_id}/bonus-config", [
            'bonus_group_id' => $this->group->public_id,
            'effective_from' => '2026-05-01',
        ])->assertForbidden();
    }

    #[Test]
    public function assign_bonus_config_rejects_invalid_bonus_group_id(): void
    {
        Passport::actingAs($this->adminUser());

        $this->postJson("/api/v1/employees/{$this->employee->public_id}/bonus-config", [
            'bonus_group_id' => 'INVALID-ID',
            'effective_from' => '2026-05-01',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['bonus_group_id']);
    }

    #[Test]
    public function assign_bonus_config_rejects_missing_fields(): void
    {
        Passport::actingAs($this->adminUser());

        $this->postJson("/api/v1/employees/{$this->employee->public_id}/bonus-config", [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['bonus_group_id', 'effective_from']);
    }
}
