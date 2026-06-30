<?php

namespace Tests\Feature\AttendancePayroll;

use App\Models\Employee;
use App\Models\EmploymentPeriod;
use App\Models\User;
use App\Models\VacationEntitlement;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class VacationEntitlementApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected Employee $employee;

    protected function setUp(): void
    {
        parent::setUp();

        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        Permission::create(['name' => 'employees.view', 'guard_name' => 'api']);
        Permission::create(['name' => 'employees.update', 'guard_name' => 'api']);
        Permission::create(['name' => 'vacation.manage', 'guard_name' => 'api']);

        $role = Role::create(['name' => 'admin', 'guard_name' => 'api']);
        $role->givePermissionTo(['employees.view', 'employees.update', 'vacation.manage']);

        foreach (Employee::POSITION_ROLES as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);
        }

        $this->admin = User::factory()->create();
        $this->admin->assignRole('admin');

        // Employee hired in 2020 → 6 years by 2026 → 22 days (LFT bracket 6-10)
        $this->employee = Employee::factory()->create();
        EmploymentPeriod::factory()->create([
            'employee_id' => $this->employee->id,
            'start_date' => '2020-03-15',
            'end_date' => null,
        ]);

        Passport::actingAs($this->admin);
    }

    #[Test]
    public function it_registers_entitlement_calculating_days_automatically(): void
    {
        $response = $this->postJson(
            "/api/v1/employees/{$this->employee->public_id}/vacation-entitlements",
            ['year' => 2026]
        );

        $response->assertStatus(201)
            ->assertJsonPath('data.year', 2026)
            ->assertJsonPath('data.entitled_days', 22)  // 2026-2020=6 years → LFT bracket
            ->assertJsonPath('data.used_days', 0)
            ->assertJsonPath('data.remaining_days', 22)
            ->assertJsonPath('data.rule_key', 'VacationsLFTMX');

        $this->assertDatabaseHas('vacation_entitlements', [
            'employee_id' => $this->employee->id,
            'year' => 2026,
            'entitled_days' => 22,
            'used_days' => 0,
        ]);
    }

    #[Test]
    public function it_rejects_duplicate_year_registration(): void
    {
        VacationEntitlement::create([
            'employee_id' => $this->employee->id,
            'year' => 2026,
            'entitled_days' => 22,
            'used_days' => 0,
            'rule_key' => 'VacationsLFTMX',
        ]);

        $response = $this->postJson(
            "/api/v1/employees/{$this->employee->public_id}/vacation-entitlements",
            ['year' => 2026]
        );

        $response->assertStatus(422)
            ->assertJsonPath('errors.year.0', fn ($v) => str_contains($v, '2026'));
    }

    #[Test]
    public function it_returns_401_for_unauthenticated_request(): void
    {
        $unauthed = $this->app->make(\Illuminate\Http\Request::class);
        $this->app->forgetInstance('auth');
        Passport::actingAs(User::factory()->create());  // fresh user with no roles

        $freshUser = User::factory()->create();
        Passport::actingAs($freshUser);

        $response = $this->postJson(
            "/api/v1/employees/{$this->employee->public_id}/vacation-entitlements",
            ['year' => 2026]
        );

        $response->assertStatus(403);
    }

    #[Test]
    public function it_validates_year_is_required(): void
    {
        $response = $this->postJson(
            "/api/v1/employees/{$this->employee->public_id}/vacation-entitlements",
            []
        );

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['year']);
    }

    #[Test]
    public function it_lists_vacation_entitlements_for_employee(): void
    {
        VacationEntitlement::create([
            'employee_id' => $this->employee->id,
            'year' => 2025,
            'entitled_days' => 20,
            'used_days' => 5,
            'rule_key' => 'VacationsLFTMX',
        ]);
        VacationEntitlement::create([
            'employee_id' => $this->employee->id,
            'year' => 2026,
            'entitled_days' => 22,
            'used_days' => 0,
            'rule_key' => 'VacationsLFTMX',
        ]);

        $response = $this->getJson(
            "/api/v1/employees/{$this->employee->public_id}/vacation-entitlements"
        );

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertCount(2, $data);
        // Most recent year first
        $this->assertSame(2026, $data[0]['year']);
        $this->assertSame(22, $data[0]['remaining_days']);
        $this->assertSame(15, $data[1]['remaining_days']); // 20-5
    }
}
