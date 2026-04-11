<?php

namespace Tests\Feature\Employees;

use App\Models\Employee;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class UserPermissionsTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private Employee $employee;

    private User $employeeUser;

    protected function setUp(): void
    {
        parent::setUp();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        Permission::create(['name' => 'users.show',    'guard_name' => 'api', 'label' => 'Ver usuario',     'group' => 'Usuarios']);
        Permission::create(['name' => 'users.update',  'guard_name' => 'api', 'label' => 'Editar usuario',  'group' => 'Usuarios']);
        Permission::create(['name' => 'employees.view', 'guard_name' => 'api', 'label' => 'Ver empleados',   'group' => 'Empleados']);
        Permission::create(['name' => 'employees.create', 'guard_name' => 'api', 'label' => 'Crear empleado', 'group' => 'Empleados']);
        Permission::create(['name' => 'employees.update', 'guard_name' => 'api', 'label' => 'Editar empleado', 'group' => 'Empleados']);
        Permission::create(['name' => 'leaves.approve', 'guard_name' => 'api', 'label' => 'Aprobar ausencia', 'group' => 'Ausencias']);

        $adminRole = Role::create(['name' => 'admin', 'guard_name' => 'api']);
        $adminRole->givePermissionTo(['users.show', 'users.update', 'employees.view', 'employees.create', 'employees.update']);

        $managerRole = Role::create(['name' => 'manager', 'guard_name' => 'api']);
        $managerRole->givePermissionTo(['employees.view', 'leaves.approve']);

        foreach (Employee::POSITION_ROLES as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);
        }

        $this->admin = User::factory()->create();
        $this->admin->assignRole('admin');

        $this->employeeUser = User::factory()->create();
        $this->employeeUser->assignRole('manager');

        $this->employee = Employee::factory()->create(['user_id' => $this->employeeUser->id]);
    }

    // ───────────────────────────────────────────────
    // GET /employees/{employee}/permissions
    // ───────────────────────────────────────────────

    #[Test]
    public function get_returns_permissions_grouped_by_module(): void
    {
        Passport::actingAs($this->admin);

        $response = $this->getJson("/api/v1/employees/{$this->employee->public_id}/permissions");

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'data' => [
                'groups' => [
                    '*' => [
                        'group',
                        'permissions' => [
                            '*' => ['name', 'label', 'source', 'via_roles'],
                        ],
                    ],
                ],
            ],
        ]);
    }

    #[Test]
    public function get_returns_role_source_for_permissions_granted_via_role(): void
    {
        Passport::actingAs($this->admin);

        $response = $this->getJson("/api/v1/employees/{$this->employee->public_id}/permissions");

        $response->assertStatus(200);

        $employeesGroup = collect($response->json('data.groups'))
            ->firstWhere('group', 'Empleados');

        $viewPermission = collect($employeesGroup['permissions'])
            ->firstWhere('name', 'employees.view');

        $this->assertEquals('role', $viewPermission['source']);
        $this->assertContains('manager', $viewPermission['via_roles']);
    }

    #[Test]
    public function get_returns_none_source_for_unassigned_permissions(): void
    {
        Passport::actingAs($this->admin);

        $response = $this->getJson("/api/v1/employees/{$this->employee->public_id}/permissions");

        $response->assertStatus(200);

        $usersGroup = collect($response->json('data.groups'))
            ->firstWhere('group', 'Usuarios');

        $updatePermission = collect($usersGroup['permissions'])
            ->firstWhere('name', 'users.update');

        $this->assertEquals('none', $updatePermission['source']);
        $this->assertEmpty($updatePermission['via_roles']);
    }

    #[Test]
    public function get_returns_direct_source_for_directly_granted_permissions(): void
    {
        $this->employeeUser->givePermissionTo('users.update');

        Passport::actingAs($this->admin);

        $response = $this->getJson("/api/v1/employees/{$this->employee->public_id}/permissions");

        $usersGroup = collect($response->json('data.groups'))
            ->firstWhere('group', 'Usuarios');

        $updatePermission = collect($usersGroup['permissions'])
            ->firstWhere('name', 'users.update');

        $this->assertEquals('direct', $updatePermission['source']);
    }

    #[Test]
    public function get_returns_404_when_employee_has_no_user(): void
    {
        $employeeWithoutUser = Employee::factory()->create();
        $employeeWithoutUser->update(['user_id' => null]);

        Passport::actingAs($this->admin);

        $this->getJson("/api/v1/employees/{$employeeWithoutUser->public_id}/permissions")
            ->assertStatus(404);
    }

    #[Test]
    public function get_requires_authentication(): void
    {
        $this->getJson("/api/v1/employees/{$this->employee->public_id}/permissions")
            ->assertStatus(401);
    }

    #[Test]
    public function get_requires_users_show_permission(): void
    {
        $restricted = User::factory()->create();
        Passport::actingAs($restricted);

        $this->getJson("/api/v1/employees/{$this->employee->public_id}/permissions")
            ->assertStatus(403);
    }

    // ───────────────────────────────────────────────
    // PUT /employees/{employee}/permissions
    // ───────────────────────────────────────────────

    #[Test]
    public function put_grants_direct_permission_to_user(): void
    {
        Passport::actingAs($this->admin);

        $response = $this->putJson("/api/v1/employees/{$this->employee->public_id}/permissions", [
            'grant' => ['users.update'],
        ]);

        $response->assertStatus(200);

        $usersGroup = collect($response->json('data.groups'))
            ->firstWhere('group', 'Usuarios');

        $updatePermission = collect($usersGroup['permissions'])
            ->firstWhere('name', 'users.update');

        $this->assertEquals('direct', $updatePermission['source']);
        $this->assertTrue($this->employeeUser->fresh()->hasDirectPermission('users.update'));
    }

    #[Test]
    public function put_revoke_removes_direct_grant_and_reverts_to_role_source(): void
    {
        $this->employeeUser->givePermissionTo('employees.view');

        Passport::actingAs($this->admin);

        $response = $this->putJson("/api/v1/employees/{$this->employee->public_id}/permissions", [
            'revoke' => ['employees.view'],
        ]);

        $response->assertStatus(200);

        $employeesGroup = collect($response->json('data.groups'))
            ->firstWhere('group', 'Empleados');

        $viewPermission = collect($employeesGroup['permissions'])
            ->firstWhere('name', 'employees.view');

        $this->assertEquals('role', $viewPermission['source']);
        $this->assertFalse($this->employeeUser->fresh()->hasDirectPermission('employees.view'));
    }

    #[Test]
    public function put_revoke_on_role_only_permission_is_no_op(): void
    {
        Passport::actingAs($this->admin);

        $response = $this->putJson("/api/v1/employees/{$this->employee->public_id}/permissions", [
            'revoke' => ['employees.view'],
        ]);

        $response->assertStatus(200);

        $employeesGroup = collect($response->json('data.groups'))
            ->firstWhere('group', 'Empleados');

        $viewPermission = collect($employeesGroup['permissions'])
            ->firstWhere('name', 'employees.view');

        $this->assertEquals('role', $viewPermission['source']);
    }

    #[Test]
    public function put_returns_422_for_unknown_permission_slug(): void
    {
        Passport::actingAs($this->admin);

        $this->putJson("/api/v1/employees/{$this->employee->public_id}/permissions", [
            'grant' => ['nonexistent.permission'],
        ])->assertStatus(422);
    }

    #[Test]
    public function put_returns_404_when_employee_has_no_user(): void
    {
        $employeeWithoutUser = Employee::factory()->create();
        $employeeWithoutUser->update(['user_id' => null]);

        Passport::actingAs($this->admin);

        $this->putJson("/api/v1/employees/{$employeeWithoutUser->public_id}/permissions", [
            'grant' => ['users.update'],
        ])->assertStatus(404);
    }

    #[Test]
    public function put_requires_authentication(): void
    {
        $this->putJson("/api/v1/employees/{$this->employee->public_id}/permissions", [
            'grant' => ['users.update'],
        ])->assertStatus(401);
    }

    #[Test]
    public function put_requires_users_update_permission(): void
    {
        $restricted = User::factory()->create();
        Passport::actingAs($restricted);

        $this->putJson("/api/v1/employees/{$this->employee->public_id}/permissions", [
            'grant' => ['users.update'],
        ])->assertStatus(403);
    }
}
