<?php

namespace Tests\Feature\AttendancePayroll;

use App\Models\Branch;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class EmployeeCrudTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected Branch $branch;

    protected function setUp(): void
    {
        parent::setUp();

        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        Permission::create(['name' => 'employees.view', 'guard_name' => 'api']);
        Permission::create(['name' => 'employees.create', 'guard_name' => 'api']);
        Permission::create(['name' => 'employees.update', 'guard_name' => 'api']);
        Permission::create(['name' => 'users.show', 'guard_name' => 'api']);
        Permission::create(['name' => 'users.index', 'guard_name' => 'api']);

        $role = Role::create(['name' => 'admin', 'guard_name' => 'api']);
        $role->givePermissionTo(['employees.view', 'employees.create', 'employees.update']);

        // Position roles (manager, cook, kitchen-assistant, delivery-driver, acting-manager)
        foreach (Employee::POSITION_ROLES as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);
        }

        $this->user = User::factory()->create();
        $this->user->assignRole('admin');

        $this->branch = Branch::factory()->create();

        Passport::actingAs($this->user);

        Notification::fake();
    }

    #[Test]
    public function it_can_create_an_employee_with_email(): void
    {
        $response = $this->postJson('/api/v1/employees', [
            'code' => 'EMP-001',
            'first_name' => 'Juan',
            'last_name' => 'Perez',
            'roles' => ['cook'],
            'email' => 'juan.perez@sushigo.com',
            'branch_id' => $this->branch->id,
            'start_date' => '2026-01-15',
        ]);

        $response->assertStatus(201)
            ->assertJsonFragment([
                'code' => 'EMP-001',
                'first_name' => 'Juan',
                'last_name' => 'Perez',
                'is_active' => true,
            ]);

        // Should return roles as array
        $roles = $response->json('data.roles');
        $this->assertIsArray($roles);
        $this->assertContains('cook', $roles);

        $this->assertDatabaseHas('employees', [
            'code' => 'EMP-001',
        ]);

        $this->assertDatabaseHas('users', [
            'email' => 'juan.perez@sushigo.com',
            'first_name' => 'Juan',
            'last_name' => 'Perez',
        ]);

        // Should auto-create employment period
        $periods = $response->json('data.employment_periods');
        $this->assertCount(1, $periods);
        $this->assertEquals($this->branch->id, $periods[0]['branch_id']);
        $this->assertEquals('2026-01-15', $periods[0]['start_date']);
        $this->assertTrue($periods[0]['is_active']);
    }

    #[Test]
    public function it_can_create_an_employee_with_phone(): void
    {
        $response = $this->postJson('/api/v1/employees', [
            'code' => 'EMP-PHONE',
            'first_name' => 'Maria',
            'last_name' => 'Lopez',
            'roles' => ['cook'],
            'phone' => '5512345678',
            'branch_id' => $this->branch->id,
            'start_date' => '2026-01-15',
        ]);

        $response->assertStatus(201)
            ->assertJsonFragment([
                'code' => 'EMP-PHONE',
                'first_name' => 'Maria',
            ]);

        $this->assertDatabaseHas('users', [
            'phone' => '5512345678',
            'phone_country' => '+52',
            'first_name' => 'Maria',
            'last_name' => 'Lopez',
        ]);
    }

    #[Test]
    public function it_can_create_an_employee_with_email_and_phone(): void
    {
        $response = $this->postJson('/api/v1/employees', [
            'code' => 'EMP-BOTH',
            'first_name' => 'Carlos',
            'last_name' => 'Garcia',
            'roles' => ['manager'],
            'email' => 'carlos@sushigo.com',
            'phone' => '5500001111',
            'branch_id' => $this->branch->id,
            'start_date' => '2026-01-15',
        ]);

        $response->assertStatus(201);

        $this->assertDatabaseHas('users', [
            'email' => 'carlos@sushigo.com',
            'phone' => '5500001111',
            'phone_country' => '+52',
        ]);
    }

    #[Test]
    public function it_can_create_employee_with_multiple_roles(): void
    {
        $response = $this->postJson('/api/v1/employees', [
            'code' => 'EMP-MULTI',
            'first_name' => 'Multi',
            'last_name' => 'Role',
            'roles' => ['cook', 'delivery-driver'],
            'email' => 'multi@sushigo.com',
            'branch_id' => $this->branch->id,
            'start_date' => '2026-01-15',
        ]);

        $response->assertStatus(201);

        $roles = $response->json('data.roles');
        $this->assertIsArray($roles);
        $this->assertContains('cook', $roles);
        $this->assertContains('delivery-driver', $roles);
        $this->assertCount(2, $roles);
    }

    #[Test]
    public function it_returns_email_and_phone_when_showing_employee(): void
    {
        // Create employee via API to get proper user association
        $createResponse = $this->postJson('/api/v1/employees', [
            'code' => 'EMP-SHOW',
            'first_name' => 'Test',
            'last_name' => 'User',
            'roles' => ['cook'],
            'email' => 'test.show@sushigo.com',
            'phone' => '5599887766',
            'branch_id' => $this->branch->id,
            'start_date' => '2026-01-15',
        ]);

        $employeeId = $createResponse->json('data.id');

        $response = $this->getJson("/api/v1/employees/{$employeeId}");

        $response->assertStatus(200)
            ->assertJsonFragment([
                'email' => 'test.show@sushigo.com',
                'phone' => '5599887766',
                'phone_country' => '+52',
            ]);
    }

    #[Test]
    public function it_validates_required_fields_on_create(): void
    {
        $response = $this->postJson('/api/v1/employees', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['code', 'first_name', 'last_name', 'roles', 'branch_id', 'start_date']);
    }

    #[Test]
    public function it_requires_email_or_phone(): void
    {
        $response = $this->postJson('/api/v1/employees', [
            'code' => 'EMP-NOID',
            'first_name' => 'Test',
            'last_name' => 'User',
            'roles' => ['cook'],
            'branch_id' => $this->branch->id,
            'start_date' => '2026-01-15',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email', 'phone']);
    }

    #[Test]
    public function it_validates_unique_code_on_create(): void
    {
        Employee::factory()->create(['code' => 'EMP-001']);

        $response = $this->postJson('/api/v1/employees', [
            'code' => 'EMP-001',
            'first_name' => 'Another',
            'last_name' => 'Employee',
            'roles' => ['cook'],
            'email' => 'another@sushigo.com',
            'branch_id' => $this->branch->id,
            'start_date' => '2026-01-15',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['code']);
    }

    #[Test]
    public function it_validates_roles_on_create(): void
    {
        $response = $this->postJson('/api/v1/employees', [
            'code' => 'EMP-001',
            'first_name' => 'Juan',
            'last_name' => 'Perez',
            'roles' => ['INVALID_ROLE'],
            'email' => 'juan@sushigo.com',
            'branch_id' => $this->branch->id,
            'start_date' => '2026-01-15',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['roles.0']);
    }

    #[Test]
    public function it_validates_roles_must_be_array(): void
    {
        $response = $this->postJson('/api/v1/employees', [
            'code' => 'EMP-001',
            'first_name' => 'Juan',
            'last_name' => 'Perez',
            'roles' => 'cook',
            'email' => 'juan@sushigo.com',
            'branch_id' => $this->branch->id,
            'start_date' => '2026-01-15',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['roles']);
    }

    #[Test]
    public function it_validates_roles_min_one(): void
    {
        $response = $this->postJson('/api/v1/employees', [
            'code' => 'EMP-001',
            'first_name' => 'Juan',
            'last_name' => 'Perez',
            'roles' => [],
            'email' => 'juan@sushigo.com',
            'branch_id' => $this->branch->id,
            'start_date' => '2026-01-15',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['roles']);
    }

    #[Test]
    public function it_can_list_employees(): void
    {
        Employee::factory()->count(3)->create();

        $response = $this->getJson('/api/v1/employees');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'data' => [
                    '*' => ['id', 'code', 'user' => ['first_name', 'last_name'], 'roles', 'is_active'],
                ],
                'meta' => ['current_page', 'total'],
            ]);

        $this->assertCount(3, $response->json('data'));
        // Verify roles is an array
        $this->assertIsArray($response->json('data.0.roles'));
    }

    #[Test]
    public function it_can_filter_employees_by_active_status(): void
    {
        Employee::factory()->count(2)->create(['is_active' => true]);
        Employee::factory()->inactive()->create();

        $response = $this->getJson('/api/v1/employees?is_active=true');

        $response->assertStatus(200);
        $this->assertCount(2, $response->json('data'));
    }

    #[Test]
    public function it_can_filter_employees_by_role(): void
    {
        Employee::factory()->cook()->count(2)->create();
        Employee::factory()->manager()->create();

        $response = $this->getJson('/api/v1/employees?role=cook');

        $response->assertStatus(200);
        $this->assertCount(2, $response->json('data'));
    }

    #[Test]
    public function it_can_search_employees_by_name(): void
    {
        Employee::factory()->withName('Juan', 'Perez')->create();
        Employee::factory()->withName('Maria', 'Lopez')->create();
        Employee::factory()->withName('Carlos', 'Juanez')->create();

        $response = $this->getJson('/api/v1/employees?search=juan');

        $response->assertStatus(200);
        $this->assertCount(2, $response->json('data'));
    }

    #[Test]
    public function it_can_show_an_employee(): void
    {
        $employee = Employee::factory()->create();

        $response = $this->getJson("/api/v1/employees/{$employee->public_id}");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'data' => ['id', 'code', 'user' => ['first_name', 'last_name', 'email', 'phone', 'phone_country'], 'roles', 'is_active'],
            ])
            ->assertJsonFragment([
                'id' => $employee->public_id,
                'code' => $employee->code,
            ]);
    }

    #[Test]
    public function it_returns_404_for_nonexistent_employee(): void
    {
        $response = $this->getJson('/api/v1/employees/invalidHashId999');

        $response->assertStatus(404);
    }

    #[Test]
    public function it_can_update_an_employee(): void
    {
        $employee = Employee::factory()->cook()->create();

        $response = $this->putJson("/api/v1/employees/{$employee->public_id}", [
            'first_name' => 'Updated Name',
            'roles' => ['manager'],
        ]);

        $response->assertStatus(200)
            ->assertJsonFragment([
                'first_name' => 'Updated Name',
            ]);

        $roles = $response->json('data.roles');
        $this->assertContains('manager', $roles);

        $this->assertDatabaseHas('users', [
            'id' => $employee->user_id,
            'first_name' => 'Updated Name',
        ]);
    }

    #[Test]
    public function it_can_update_employee_with_multiple_roles(): void
    {
        $employee = Employee::factory()->cook()->create();

        $response = $this->putJson("/api/v1/employees/{$employee->public_id}", [
            'roles' => ['cook', 'delivery-driver'],
        ]);

        $response->assertStatus(200);

        $roles = $response->json('data.roles');
        $this->assertContains('cook', $roles);
        $this->assertContains('delivery-driver', $roles);
        $this->assertCount(2, $roles);
    }

    #[Test]
    public function it_validates_roles_on_update(): void
    {
        $employee = Employee::factory()->create();

        $response = $this->putJson("/api/v1/employees/{$employee->public_id}", [
            'roles' => ['INVALID_ROLE'],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['roles.0']);
    }

    #[Test]
    public function toggle_active_rejects_employee_without_employment_period_with_422(): void
    {
        // No employment period — toggle must reject
        $employee = Employee::factory()->create(['is_active' => true]);

        $response = $this->patchJson("/api/v1/employees/{$employee->public_id}/toggle-active");

        $response->assertStatus(422);
    }

    #[Test]
    public function toggle_active_rejects_inactive_employee_with_422(): void
    {
        // No employment period — toggle must reject
        $employee = Employee::factory()->inactive()->create();

        $response = $this->patchJson("/api/v1/employees/{$employee->public_id}/toggle-active");

        $response->assertStatus(422);
    }

    #[Test]
    public function toggle_active_deactivates_employee_with_active_period(): void
    {
        $employee = Employee::factory()->create(['is_active' => true]);
        \App\Models\EmploymentPeriod::factory()->forEmployee($employee)->create(['is_active' => true]);

        $response = $this->patchJson("/api/v1/employees/{$employee->public_id}/toggle-active");

        $response->assertStatus(200)
            ->assertJsonFragment(['is_active' => false]);
        $this->assertDatabaseHas('employees', ['id' => $employee->id, 'is_active' => false]);
    }

    #[Test]
    public function toggle_active_activates_employee_with_active_period(): void
    {
        // Employee is_active=false but still has an active employment period (was toggled off, not given baja)
        $employee = Employee::factory()->create(['is_active' => false]);
        \App\Models\EmploymentPeriod::factory()->forEmployee($employee)->create(['is_active' => true]);

        $response = $this->patchJson("/api/v1/employees/{$employee->public_id}/toggle-active");

        $response->assertStatus(200)
            ->assertJsonFragment(['is_active' => true]);
        $this->assertDatabaseHas('employees', ['id' => $employee->id, 'is_active' => true]);
    }

    #[Test]
    public function it_paginates_employees(): void
    {
        Employee::factory()->count(20)->create();

        $response = $this->getJson('/api/v1/employees?per_page=5');

        $response->assertStatus(200);
        $this->assertCount(5, $response->json('data'));
        $this->assertEquals(20, $response->json('meta.total'));
        $this->assertEquals(4, $response->json('meta.last_page'));
    }

    #[Test]
    public function it_rejects_unauthenticated_access(): void
    {
        app('auth')->forgetGuards();

        $response = $this->getJson('/api/v1/employees');

        $response->assertStatus(401);
    }

    #[Test]
    public function it_can_create_employee_with_meta(): void
    {
        $response = $this->postJson('/api/v1/employees', [
            'code' => 'EMP-004',
            'first_name' => 'Ana',
            'last_name' => 'Martinez',
            'roles' => ['kitchen-assistant'],
            'email' => 'ana.martinez@sushigo.com',
            'meta' => ['notes' => 'Part-time'],
            'branch_id' => $this->branch->id,
            'start_date' => '2026-01-15',
        ]);

        $response->assertStatus(201);

        $this->assertDatabaseHas('employees', [
            'code' => 'EMP-004',
        ]);
    }

    #[Test]
    public function it_returns_ulid_instead_of_integer_id(): void
    {
        $response = $this->postJson('/api/v1/employees', [
            'code' => 'EMP-ULID',
            'first_name' => 'Ulid',
            'last_name' => 'Test',
            'roles' => ['cook'],
            'email' => 'ulid@sushigo.com',
            'branch_id' => $this->branch->id,
            'start_date' => '2026-01-15',
        ]);

        $response->assertStatus(201);

        $id = $response->json('data.id');
        $this->assertIsString($id);
        $this->assertEquals(26, strlen($id), 'ID should be a 26-character ULID');
        $this->assertMatchesRegularExpression('/^[0-9A-HJKMNP-TV-Z]{26}$/', $id, 'ID should match ULID format');
    }

    #[Test]
    public function it_returns_404_for_invalid_public_id(): void
    {
        $response = $this->getJson('/api/v1/employees/totallyInvalidPublicId99');

        $response->assertStatus(404);
    }

    #[Test]
    public function it_rejects_list_without_employees_view_permission(): void
    {
        $userWithoutPermission = User::factory()->create();
        Passport::actingAs($userWithoutPermission);

        $response = $this->getJson('/api/v1/employees');

        $response->assertStatus(403);
    }

    #[Test]
    public function it_rejects_create_without_employees_create_permission(): void
    {
        $userWithoutPermission = User::factory()->create();
        Passport::actingAs($userWithoutPermission);

        $response = $this->postJson('/api/v1/employees', [
            'code' => 'EMP-NOPERM',
            'first_name' => 'No',
            'last_name' => 'Permission',
            'roles' => ['cook'],
            'email' => 'noperm@sushigo.com',
            'branch_id' => $this->branch->id,
            'start_date' => '2026-01-15',
        ]);

        $response->assertStatus(403);
    }

    #[Test]
    public function it_rejects_update_without_employees_update_permission(): void
    {
        $employee = Employee::factory()->create();

        $userWithoutPermission = User::factory()->create();
        Passport::actingAs($userWithoutPermission);

        $response = $this->putJson("/api/v1/employees/{$employee->public_id}", [
            'first_name' => 'Should Fail',
        ]);

        $response->assertStatus(403);
    }

    #[Test]
    public function it_creates_cook_with_cook_position_role(): void
    {
        $response = $this->postJson('/api/v1/employees', [
            'code' => 'EMP-USR-001',
            'first_name' => 'Carlos',
            'last_name' => 'Mendoza',
            'roles' => ['cook'],
            'email' => 'carlos@sushigo.com',
            'branch_id' => $this->branch->id,
            'start_date' => '2026-01-15',
        ]);

        $response->assertStatus(201);

        $employee = Employee::where('code', 'EMP-USR-001')->first();
        $this->assertNotNull($employee->user_id);

        $user = User::find($employee->user_id);
        $this->assertTrue($user->hasRole('cook'));
        $this->assertFalse($user->hasRole('manager'));
    }

    #[Test]
    public function it_creates_manager_with_manager_position_role(): void
    {
        $response = $this->postJson('/api/v1/employees', [
            'code' => 'EMP-MGR-001',
            'first_name' => 'Ana',
            'last_name' => 'Garcia',
            'roles' => ['manager'],
            'email' => 'ana.garcia@sushigo.com',
            'branch_id' => $this->branch->id,
            'start_date' => '2026-01-15',
        ]);

        $response->assertStatus(201);

        $employee = Employee::where('code', 'EMP-MGR-001')->first();
        $user = User::find($employee->user_id);
        $this->assertTrue($user->hasRole('manager'));
        $this->assertFalse($user->hasRole('cook'));
    }

    #[Test]
    public function it_rejects_duplicate_email_when_creating_employee(): void
    {
        User::factory()->create(['email' => 'taken@sushigo.com']);

        $response = $this->postJson('/api/v1/employees', [
            'code' => 'EMP-DUP',
            'first_name' => 'Test',
            'last_name' => 'User',
            'roles' => ['cook'],
            'email' => 'taken@sushigo.com',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    #[Test]
    public function it_rejects_duplicate_phone_when_creating_employee(): void
    {
        User::factory()->create(['phone' => '5599990000']);

        $response = $this->postJson('/api/v1/employees', [
            'code' => 'EMP-DUP-P',
            'first_name' => 'Test',
            'last_name' => 'User',
            'roles' => ['cook'],
            'phone' => '5599990000',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['phone']);
    }

    #[Test]
    public function it_rolls_back_user_creation_on_employee_failure(): void
    {
        // Create an employee with the same code first
        Employee::factory()->create(['code' => 'EMP-ROLLBACK']);

        $response = $this->postJson('/api/v1/employees', [
            'code' => 'EMP-ROLLBACK',
            'first_name' => 'Rollback',
            'last_name' => 'Test',
            'roles' => ['cook'],
            'email' => 'rollback@sushigo.com',
            'branch_id' => $this->branch->id,
            'start_date' => '2026-01-15',
        ]);

        // Should fail on duplicate code validation
        $response->assertStatus(422);

        // User should NOT have been created
        $this->assertDatabaseMissing('users', [
            'email' => 'rollback@sushigo.com',
        ]);
    }

    #[Test]
    public function toggle_returns_422_message(): void
    {
        $employee = Employee::factory()->cook()->create();

        $response = $this->patchJson("/api/v1/employees/{$employee->public_id}/toggle-active");

        $response->assertStatus(422)
            ->assertJsonStructure(['message']);
    }

    // --- status=baja filter ---

    #[Test]
    public function it_can_filter_employees_by_baja_status(): void
    {
        // Active employee — has an active employment period
        $active = Employee::factory()->create(['is_active' => true]);
        \App\Models\EmploymentPeriod::factory()->forEmployee($active)->create(['is_active' => true]);

        // Baja employee — has only a terminated period
        $baja = Employee::factory()->create(['is_active' => false]);
        \App\Models\EmploymentPeriod::factory()->forEmployee($baja)->terminated()->create();

        $response = $this->getJson('/api/v1/employees?status=baja');

        $response->assertStatus(200);
        $ids = collect($response->json('data'))->pluck('id');
        $this->assertContains($baja->public_id, $ids);
        $this->assertNotContains($active->public_id, $ids);
    }

    #[Test]
    public function it_excludes_active_employees_from_baja_filter(): void
    {
        Employee::factory()->count(3)->create(['is_active' => true])->each(function ($emp) {
            \App\Models\EmploymentPeriod::factory()->forEmployee($emp)->create(['is_active' => true]);
        });

        $response = $this->getJson('/api/v1/employees?status=baja');

        $response->assertStatus(200);
        $this->assertCount(0, $response->json('data'));
    }

    #[Test]
    public function it_can_combine_baja_filter_with_search(): void
    {
        $bajaJuan = Employee::factory()->withName('Juan', 'Perez')->create(['is_active' => false]);
        \App\Models\EmploymentPeriod::factory()->forEmployee($bajaJuan)->terminated()->create();

        $bajaMaria = Employee::factory()->withName('Maria', 'Lopez')->create(['is_active' => false]);
        \App\Models\EmploymentPeriod::factory()->forEmployee($bajaMaria)->terminated()->create();

        $response = $this->getJson('/api/v1/employees?status=baja&search=Juan');

        $response->assertStatus(200);
        $this->assertCount(1, $response->json('data'));
        $this->assertEquals($bajaJuan->public_id, $response->json('data.0.id'));
    }

    // --- AP-005a: Role-based assignment control ---

    #[Test]
    public function super_admin_can_assign_super_admin_role(): void
    {
        $superAdminRole = Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'api']);
        $superAdminRole->givePermissionTo(['employees.view', 'employees.create', 'employees.update']);

        $superAdmin = User::factory()->create();
        $superAdmin->assignRole('super-admin');
        Passport::actingAs($superAdmin);

        $response = $this->postJson('/api/v1/employees', [
            'code' => 'EMP-SA-ASSIGN',
            'first_name' => 'Super',
            'last_name' => 'Test',
            'roles' => ['super-admin'],
            'email' => 'sa-assign@sushigo.com',
            'branch_id' => $this->branch->id,
            'start_date' => '2026-01-15',
        ]);

        $response->assertStatus(201);
        $this->assertContains('super-admin', $response->json('data.roles'));
    }

    #[Test]
    public function non_super_admin_cannot_assign_super_admin_role(): void
    {
        Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'api']);

        // $this->user is an admin (not super-admin) — super-admin is not in their assignable roles
        // The FormRequest rejects it as an invalid role value → 422
        $response = $this->postJson('/api/v1/employees', [
            'code' => 'EMP-SA-BLOCK',
            'first_name' => 'Regular',
            'last_name' => 'Admin',
            'roles' => ['super-admin'],
            'email' => 'sa-block@sushigo.com',
            'branch_id' => $this->branch->id,
            'start_date' => '2026-01-15',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['roles.0']);
    }

    #[Test]
    public function get_assignable_roles_returns_all_roles_for_super_admin(): void
    {
        Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'api']);

        $superAdmin = User::factory()->create();
        $superAdmin->assignRole('super-admin');

        $assignable = Employee::getAssignableRolesFor($superAdmin);

        $this->assertContains(Employee::ROLE_SUPER_ADMIN, $assignable);
        $this->assertCount(count(Employee::POSITION_ROLES), $assignable);
    }

    #[Test]
    public function get_assignable_roles_excludes_super_admin_for_regular_user(): void
    {
        $regularUser = User::factory()->create();
        $regularUser->assignRole('admin');

        $assignable = Employee::getAssignableRolesFor($regularUser);

        $this->assertNotContains(Employee::ROLE_SUPER_ADMIN, $assignable);
        $this->assertContains(Employee::ROLE_MANAGER, $assignable);
        $this->assertContains(Employee::ROLE_COOK, $assignable);
    }

    #[Test]
    public function sync_position_roles_preserves_super_admin_role_when_updated_by_non_super_admin(): void
    {
        Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'api']);

        // Create an employee who has super-admin role
        $employee = Employee::factory()->create();
        $employee->user->assignRole('super-admin');
        $this->assertTrue($employee->user->hasRole('super-admin'));

        // A regular admin tries to update the employee with only cook — no super-admin in payload
        // syncPositionRoles must preserve super-admin since the acting user cannot manage it
        $response = $this->putJson("/api/v1/employees/{$employee->public_id}", [
            'first_name' => $employee->user->first_name,
            'last_name' => $employee->user->last_name,
            'roles' => ['cook'],
        ]);

        $response->assertStatus(200);
        $this->assertContains('super-admin', $response->json('data.roles'));
        $this->assertContains('cook', $response->json('data.roles'));
    }
}
