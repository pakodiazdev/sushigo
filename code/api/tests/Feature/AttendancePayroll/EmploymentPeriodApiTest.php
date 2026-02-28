<?php

namespace Tests\Feature\AttendancePayroll;

use App\Models\Branch;
use App\Models\Employee;
use App\Models\EmploymentPeriod;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class EmploymentPeriodApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected Employee $employee;

    protected Branch $branch;

    protected function setUp(): void
    {
        parent::setUp();

        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        Permission::create(['name' => 'employees.view', 'guard_name' => 'api']);
        Permission::create(['name' => 'employees.update', 'guard_name' => 'api']);

        $role = Role::create(['name' => 'admin', 'guard_name' => 'api']);
        $role->givePermissionTo(['employees.view', 'employees.update']);

        // System roles required by syncPositionRoles()
        Role::firstOrCreate(['name' => 'employee', 'guard_name' => 'api']);
        Role::firstOrCreate(['name' => 'employee-manager', 'guard_name' => 'api']);

        foreach (Employee::POSITION_ROLES as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);
        }

        $this->user = User::factory()->create();
        $this->user->assignRole('admin');

        $this->employee = Employee::factory()->create(['is_active' => true]);
        $this->branch = Branch::factory()->create();

        Passport::actingAs($this->user);
        Notification::fake();
    }

    // =========================================================================
    // Show Employee includes employment_periods
    // =========================================================================

    #[Test]
    public function show_employee_includes_employment_periods(): void
    {
        $period = EmploymentPeriod::factory()
            ->forEmployee($this->employee)
            ->forBranch($this->branch)
            ->create(['start_date' => '2026-01-15']);

        $response = $this->getJson("/api/v1/employees/{$this->employee->public_id}");

        $response->assertOk()
            ->assertJsonPath('data.employment_periods.0.id', $period->public_id)
            ->assertJsonPath('data.employment_periods.0.branch_name', $this->branch->name)
            ->assertJsonPath('data.employment_periods.0.start_date', '2026-01-15')
            ->assertJsonPath('data.employment_periods.0.is_active', true);
    }

    #[Test]
    public function show_employee_returns_empty_array_when_no_periods(): void
    {
        $response = $this->getJson("/api/v1/employees/{$this->employee->public_id}");

        $response->assertOk()
            ->assertJsonPath('data.employment_periods', []);
    }

    // =========================================================================
    // Deactivate Employee (Baja)
    // =========================================================================

    #[Test]
    public function it_can_deactivate_an_employee(): void
    {
        EmploymentPeriod::factory()
            ->forEmployee($this->employee)
            ->forBranch($this->branch)
            ->create(['start_date' => '2026-01-01']);

        $response = $this->patchJson(
            "/api/v1/employees/{$this->employee->public_id}/deactivate",
            [
                'end_date' => '2026-02-15',
                'termination_reason' => 'Renuncia voluntaria',
            ]
        );

        $response->assertOk()
            ->assertJsonPath('data.is_active', false);

        $this->assertDatabaseHas('employees', [
            'id' => $this->employee->id,
            'is_active' => false,
        ]);

        $this->assertDatabaseHas('employment_periods', [
            'employee_id' => $this->employee->id,
            'is_active' => false,
            'termination_reason' => 'Renuncia voluntaria',
        ]);
    }

    #[Test]
    public function deactivate_allows_null_reason(): void
    {
        EmploymentPeriod::factory()
            ->forEmployee($this->employee)
            ->forBranch($this->branch)
            ->create(['start_date' => '2026-01-01']);

        $response = $this->patchJson(
            "/api/v1/employees/{$this->employee->public_id}/deactivate",
            [
                'end_date' => '2026-02-15',
            ]
        );

        $response->assertOk()
            ->assertJsonPath('data.is_active', false);

        $periods = $response->json('data.employment_periods');
        $activePeriod = collect($periods)->firstWhere('is_active', false);
        $this->assertNull($activePeriod['termination_reason']);
    }

    #[Test]
    public function deactivate_rejects_when_no_active_period(): void
    {
        // Employee with no employment periods
        $response = $this->patchJson(
            "/api/v1/employees/{$this->employee->public_id}/deactivate",
            [
                'end_date' => '2026-02-15',
            ]
        );

        $response->assertUnprocessable()
            ->assertJsonValidationErrors('employee');
    }

    #[Test]
    public function deactivate_rejects_end_date_before_start_date(): void
    {
        EmploymentPeriod::factory()
            ->forEmployee($this->employee)
            ->forBranch($this->branch)
            ->create(['start_date' => '2026-06-01']);

        $response = $this->patchJson(
            "/api/v1/employees/{$this->employee->public_id}/deactivate",
            [
                'end_date' => '2026-01-01',
            ]
        );

        $response->assertUnprocessable()
            ->assertJsonValidationErrors('end_date');
    }

    #[Test]
    public function deactivate_requires_end_date(): void
    {
        EmploymentPeriod::factory()
            ->forEmployee($this->employee)
            ->forBranch($this->branch)
            ->create();

        $response = $this->patchJson(
            "/api/v1/employees/{$this->employee->public_id}/deactivate",
            []
        );

        $response->assertUnprocessable()
            ->assertJsonValidationErrors('end_date');
    }

    #[Test]
    public function deactivate_returns_employment_periods_in_response(): void
    {
        EmploymentPeriod::factory()
            ->forEmployee($this->employee)
            ->forBranch($this->branch)
            ->create(['start_date' => '2026-01-01']);

        $response = $this->patchJson(
            "/api/v1/employees/{$this->employee->public_id}/deactivate",
            [
                'end_date' => '2026-02-15',
            ]
        );

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'id', 'code', 'first_name', 'last_name', 'is_active',
                    'employment_periods' => [
                        '*' => ['id', 'branch_id', 'branch_name', 'start_date', 'end_date', 'is_active'],
                    ],
                ],
            ]);
    }

    // =========================================================================
    // Rehire Employee (Reingreso)
    // =========================================================================

    #[Test]
    public function it_can_rehire_an_employee(): void
    {
        // Deactivate employee first
        $this->employee->update(['is_active' => false]);
        EmploymentPeriod::factory()
            ->forEmployee($this->employee)
            ->forBranch($this->branch)
            ->terminated()
            ->create();

        $newBranch = Branch::factory()->create();

        $response = $this->patchJson(
            "/api/v1/employees/{$this->employee->public_id}/rehire",
            [
                'branch_id' => $newBranch->id,
                'start_date' => '2026-03-01',
            ]
        );

        $response->assertOk()
            ->assertJsonPath('data.is_active', true);

        $this->assertDatabaseHas('employees', [
            'id' => $this->employee->id,
            'is_active' => true,
        ]);

        $this->assertDatabaseHas('employment_periods', [
            'employee_id' => $this->employee->id,
            'branch_id' => $newBranch->id,
            'is_active' => true,
        ]);
    }

    #[Test]
    public function rehire_rejects_when_employee_is_active(): void
    {
        $response = $this->patchJson(
            "/api/v1/employees/{$this->employee->public_id}/rehire",
            [
                'branch_id' => $this->branch->id,
                'start_date' => '2026-03-01',
            ]
        );

        $response->assertUnprocessable()
            ->assertJsonValidationErrors('employee');
    }

    #[Test]
    public function rehire_rejects_when_active_period_exists(): void
    {
        // Inactive employee but somehow has an active period
        $this->employee->update(['is_active' => false]);
        EmploymentPeriod::factory()
            ->forEmployee($this->employee)
            ->forBranch($this->branch)
            ->create(['is_active' => true]);

        $response = $this->patchJson(
            "/api/v1/employees/{$this->employee->public_id}/rehire",
            [
                'branch_id' => $this->branch->id,
                'start_date' => '2026-03-01',
            ]
        );

        $response->assertUnprocessable()
            ->assertJsonValidationErrors('employee');
    }

    #[Test]
    public function rehire_validates_required_fields(): void
    {
        $this->employee->update(['is_active' => false]);

        $response = $this->patchJson(
            "/api/v1/employees/{$this->employee->public_id}/rehire",
            []
        );

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['branch_id', 'start_date']);
    }

    #[Test]
    public function rehire_validates_branch_exists(): void
    {
        $this->employee->update(['is_active' => false]);

        $response = $this->patchJson(
            "/api/v1/employees/{$this->employee->public_id}/rehire",
            [
                'branch_id' => 99999,
                'start_date' => '2026-03-01',
            ]
        );

        $response->assertUnprocessable()
            ->assertJsonValidationErrors('branch_id');
    }

    #[Test]
    public function rehire_returns_employment_periods_in_response(): void
    {
        $this->employee->update(['is_active' => false]);
        EmploymentPeriod::factory()
            ->forEmployee($this->employee)
            ->forBranch($this->branch)
            ->terminated()
            ->create();

        $response = $this->patchJson(
            "/api/v1/employees/{$this->employee->public_id}/rehire",
            [
                'branch_id' => $this->branch->id,
                'start_date' => '2026-03-01',
            ]
        );

        $response->assertOk();
        $periods = $response->json('data.employment_periods');
        $this->assertCount(2, $periods);
    }

    // =========================================================================
    // Toggle Active rejects
    // =========================================================================

    #[Test]
    public function toggle_active_rejects_with_422(): void
    {
        $response = $this->patchJson(
            "/api/v1/employees/{$this->employee->public_id}/toggle-active"
        );

        $response->assertUnprocessable();
    }

    // =========================================================================
    // Authorization
    // =========================================================================

    #[Test]
    public function unauthorized_user_cannot_deactivate_employee(): void
    {
        EmploymentPeriod::factory()
            ->forEmployee($this->employee)
            ->forBranch($this->branch)
            ->create();

        $unprivilegedUser = User::factory()->create();
        Passport::actingAs($unprivilegedUser);

        $response = $this->patchJson(
            "/api/v1/employees/{$this->employee->public_id}/deactivate",
            [
                'end_date' => '2026-02-15',
            ]
        );

        $response->assertForbidden();
    }

    #[Test]
    public function unauthorized_user_cannot_rehire_employee(): void
    {
        $this->employee->update(['is_active' => false]);

        $unprivilegedUser = User::factory()->create();
        Passport::actingAs($unprivilegedUser);

        $response = $this->patchJson(
            "/api/v1/employees/{$this->employee->public_id}/rehire",
            [
                'branch_id' => $this->branch->id,
                'start_date' => '2026-03-01',
            ]
        );

        $response->assertForbidden();
    }
}
