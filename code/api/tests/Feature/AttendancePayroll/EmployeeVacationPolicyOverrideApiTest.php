<?php

namespace Tests\Feature\AttendancePayroll;

use App\Models\Employee;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class EmployeeVacationPolicyOverrideApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        Permission::create(['name' => 'employees.update', 'guard_name' => 'api']);
        $admin = Role::create(['name' => 'admin', 'guard_name' => 'api']);
        $admin->givePermissionTo('employees.update');

        foreach (Employee::POSITION_ROLES as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);
        }
    }

    private function adminUser(): User
    {
        $user = User::factory()->create();
        $user->assignRole('admin');

        return $user;
    }

    #[Test]
    public function admin_can_set_a_contractual_override(): void
    {
        $employee = Employee::factory()->create();
        Passport::actingAs($this->adminUser());

        $response = $this->putJson("/api/v1/employees/{$employee->public_id}/vacation-policy-override", [
            'rule_key' => 'ContractualPolicy',
            'tiers' => [
                ['years_from' => 1, 'days' => 30],
            ],
        ]);

        $response->assertOk()
            ->assertJsonPath('data.rule_key', 'ContractualPolicy')
            ->assertJsonPath('data.active_rule_label', 'Política contractual')
            ->assertJsonCount(1, 'data.tiers');

        $employee->refresh();
        $this->assertSame('ContractualPolicy', $employee->vacation_entitlement_rule_key);
        $this->assertSame([['years_from' => 1, 'days' => 30]], $employee->vacation_entitlement_custom_table);
    }

    #[Test]
    public function admin_can_clear_the_override_back_to_tenant_default(): void
    {
        $employee = Employee::factory()->create([
            'vacation_entitlement_rule_key' => 'ContractualPolicy',
            'vacation_entitlement_custom_table' => [['years_from' => 1, 'days' => 30]],
        ]);
        Passport::actingAs($this->adminUser());

        $response = $this->putJson("/api/v1/employees/{$employee->public_id}/vacation-policy-override", [
            'rule_key' => null,
        ]);

        $response->assertOk()
            ->assertJsonPath('data.rule_key', null)
            ->assertJsonPath('data.active_rule_label', 'LFT México 2022')
            ->assertJsonCount(0, 'data.tiers');

        $employee->refresh();
        $this->assertNull($employee->vacation_entitlement_rule_key);
        $this->assertNull($employee->vacation_entitlement_custom_table);
    }

    #[Test]
    public function update_rejects_contractual_policy_without_tiers(): void
    {
        $employee = Employee::factory()->create();
        Passport::actingAs($this->adminUser());

        $this->putJson("/api/v1/employees/{$employee->public_id}/vacation-policy-override", [
            'rule_key' => 'ContractualPolicy',
        ])->assertUnprocessable();
    }

    #[Test]
    public function update_rejects_duplicate_years_from(): void
    {
        $employee = Employee::factory()->create();
        Passport::actingAs($this->adminUser());

        $this->putJson("/api/v1/employees/{$employee->public_id}/vacation-policy-override", [
            'rule_key' => 'ContractualPolicy',
            'tiers' => [
                ['years_from' => 1, 'days' => 20],
                ['years_from' => 1, 'days' => 25],
            ],
        ])->assertUnprocessable();
    }

    #[Test]
    public function update_rejects_an_unknown_rule_key(): void
    {
        $employee = Employee::factory()->create();
        Passport::actingAs($this->adminUser());

        $this->putJson("/api/v1/employees/{$employee->public_id}/vacation-policy-override", [
            'rule_key' => 'SomethingElse',
        ])->assertUnprocessable();
    }

    #[Test]
    public function unauthenticated_cannot_update_override(): void
    {
        $employee = Employee::factory()->create();

        $this->putJson("/api/v1/employees/{$employee->public_id}/vacation-policy-override", [
            'rule_key' => null,
        ])->assertUnauthorized();
    }

    #[Test]
    public function user_without_permission_cannot_update_override(): void
    {
        $employee = Employee::factory()->create();
        Passport::actingAs(User::factory()->create());

        $this->putJson("/api/v1/employees/{$employee->public_id}/vacation-policy-override", [
            'rule_key' => null,
        ])->assertForbidden();
    }
}
