<?php

namespace Tests\Feature\AttendancePayroll;

use App\Enums\EmployeeRole;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class EmployeeCrudTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

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

        // Create employee operational roles
        $employeeRole = Role::create(['name' => 'employee', 'guard_name' => 'api']);
        $employeeRole->givePermissionTo(['users.show', 'users.index']);

        $employeeManagerRole = Role::create(['name' => 'employee-manager', 'guard_name' => 'api']);
        $employeeManagerRole->givePermissionTo(['users.show', 'users.index', 'employees.view']);

        $this->user = User::factory()->create();
        $this->user->assignRole('admin');

        Passport::actingAs($this->user);
    }

    #[Test]
    public function it_can_create_an_employee_with_email(): void
    {
        $response = $this->postJson('/api/v1/employees', [
            'code' => 'EMP-001',
            'first_name' => 'Juan',
            'last_name' => 'Perez',
            'role' => 'COOK',
            'email' => 'juan.perez@sushigo.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(201)
            ->assertJsonFragment([
                'code' => 'EMP-001',
                'first_name' => 'Juan',
                'last_name' => 'Perez',
                'role' => 'COOK',
                'is_active' => true,
            ]);

        $this->assertDatabaseHas('employees', [
            'code' => 'EMP-001',
            'first_name' => 'Juan',
        ]);

        $this->assertDatabaseHas('users', [
            'email' => 'juan.perez@sushigo.com',
            'name' => 'Juan Perez',
        ]);
    }

    #[Test]
    public function it_can_create_an_employee_with_phone(): void
    {
        $response = $this->postJson('/api/v1/employees', [
            'code' => 'EMP-PHONE',
            'first_name' => 'Maria',
            'last_name' => 'Lopez',
            'role' => 'COOK',
            'phone' => '+525512345678',
            'password' => 'password123',
        ]);

        $response->assertStatus(201)
            ->assertJsonFragment([
                'code' => 'EMP-PHONE',
                'first_name' => 'Maria',
            ]);

        $this->assertDatabaseHas('users', [
            'phone' => '+525512345678',
            'name' => 'Maria Lopez',
        ]);
    }

    #[Test]
    public function it_can_create_an_employee_with_email_and_phone(): void
    {
        $response = $this->postJson('/api/v1/employees', [
            'code' => 'EMP-BOTH',
            'first_name' => 'Carlos',
            'last_name' => 'Garcia',
            'role' => 'MANAGER',
            'email' => 'carlos@sushigo.com',
            'phone' => '+525500001111',
            'password' => 'password123',
        ]);

        $response->assertStatus(201);

        $this->assertDatabaseHas('users', [
            'email' => 'carlos@sushigo.com',
            'phone' => '+525500001111',
        ]);
    }

    #[Test]
    public function it_auto_uppercases_code_and_role(): void
    {
        $response = $this->postJson('/api/v1/employees', [
            'code' => 'emp-002',
            'first_name' => 'Maria',
            'last_name' => 'Garcia',
            'role' => 'manager',
            'email' => 'maria.garcia@sushigo.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(201);

        $this->assertDatabaseHas('employees', [
            'code' => 'EMP-002',
            'role' => 'MANAGER',
        ]);
    }

    #[Test]
    public function it_validates_required_fields_on_create(): void
    {
        $response = $this->postJson('/api/v1/employees', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['code', 'first_name', 'last_name', 'role', 'password']);
    }

    #[Test]
    public function it_requires_email_or_phone(): void
    {
        $response = $this->postJson('/api/v1/employees', [
            'code' => 'EMP-NOID',
            'first_name' => 'Test',
            'last_name' => 'User',
            'role' => 'COOK',
            'password' => 'password123',
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
            'role' => 'COOK',
            'email' => 'another@sushigo.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['code']);
    }

    #[Test]
    public function it_validates_role_enum_on_create(): void
    {
        $response = $this->postJson('/api/v1/employees', [
            'code' => 'EMP-001',
            'first_name' => 'Juan',
            'last_name' => 'Perez',
            'role' => 'INVALID_ROLE',
            'email' => 'juan@sushigo.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['role']);
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
                    '*' => ['id', 'code', 'first_name', 'last_name', 'role', 'is_active'],
                ],
                'meta' => ['current_page', 'total'],
            ]);

        $this->assertCount(3, $response->json('data'));
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

        $response = $this->getJson('/api/v1/employees?role=COOK');

        $response->assertStatus(200);
        $this->assertCount(2, $response->json('data'));
    }

    #[Test]
    public function it_can_search_employees_by_name(): void
    {
        Employee::factory()->create(['first_name' => 'Juan', 'last_name' => 'Perez']);
        Employee::factory()->create(['first_name' => 'Maria', 'last_name' => 'Lopez']);
        Employee::factory()->create(['first_name' => 'Carlos', 'last_name' => 'Juanez']);

        $response = $this->getJson('/api/v1/employees?search=juan');

        $response->assertStatus(200);
        $this->assertCount(2, $response->json('data'));
    }

    #[Test]
    public function it_can_show_an_employee(): void
    {
        $employee = Employee::factory()->create();

        $response = $this->getJson("/api/v1/employees/{$employee->hashid}");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'data' => ['id', 'code', 'first_name', 'last_name', 'role', 'is_active'],
            ])
            ->assertJsonFragment([
                'id' => $employee->hashid,
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

        $response = $this->putJson("/api/v1/employees/{$employee->hashid}", [
            'first_name' => 'Updated Name',
            'role' => 'MANAGER',
        ]);

        $response->assertStatus(200)
            ->assertJsonFragment([
                'first_name' => 'Updated Name',
                'role' => 'MANAGER',
            ]);

        $this->assertDatabaseHas('employees', [
            'id' => $employee->id,
            'first_name' => 'Updated Name',
            'role' => 'MANAGER',
        ]);
    }

    #[Test]
    public function it_validates_role_enum_on_update(): void
    {
        $employee = Employee::factory()->create();

        $response = $this->putJson("/api/v1/employees/{$employee->hashid}", [
            'role' => 'INVALID_ROLE',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['role']);
    }

    #[Test]
    public function it_can_toggle_employee_active_status(): void
    {
        $employee = Employee::factory()->create(['is_active' => true]);

        $response = $this->patchJson("/api/v1/employees/{$employee->hashid}/toggle-active");

        $response->assertStatus(200)
            ->assertJsonFragment(['is_active' => false]);

        $this->assertDatabaseHas('employees', [
            'id' => $employee->id,
            'is_active' => false,
        ]);
    }

    #[Test]
    public function it_can_toggle_inactive_to_active(): void
    {
        $employee = Employee::factory()->inactive()->create();

        $response = $this->patchJson("/api/v1/employees/{$employee->hashid}/toggle-active");

        $response->assertStatus(200)
            ->assertJsonFragment(['is_active' => true]);

        $this->assertDatabaseHas('employees', [
            'id' => $employee->id,
            'is_active' => true,
        ]);
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
            'role' => 'KITCHEN_ASSISTANT',
            'email' => 'ana.martinez@sushigo.com',
            'password' => 'password123',
            'meta' => ['notes' => 'Part-time'],
        ]);

        $response->assertStatus(201);

        $this->assertDatabaseHas('employees', [
            'code' => 'EMP-004',
        ]);
    }

    #[Test]
    public function it_returns_hashid_instead_of_integer_id(): void
    {
        $response = $this->postJson('/api/v1/employees', [
            'code' => 'EMP-HASH',
            'first_name' => 'Hash',
            'last_name' => 'Test',
            'role' => 'COOK',
            'email' => 'hash@sushigo.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(201);

        $id = $response->json('data.id');
        $this->assertIsString($id);
        $this->assertFalse(is_numeric($id), 'ID should be a hashid, not a numeric value');
    }

    #[Test]
    public function it_returns_404_for_invalid_hashid(): void
    {
        $response = $this->getJson('/api/v1/employees/totallyInvalidHashid');

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
            'role' => 'COOK',
            'email' => 'noperm@sushigo.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(403);
    }

    #[Test]
    public function it_rejects_update_without_employees_update_permission(): void
    {
        $employee = Employee::factory()->create();

        $userWithoutPermission = User::factory()->create();
        Passport::actingAs($userWithoutPermission);

        $response = $this->putJson("/api/v1/employees/{$employee->hashid}", [
            'first_name' => 'Should Fail',
        ]);

        $response->assertStatus(403);
    }

    #[Test]
    public function it_creates_cook_with_employee_spatie_role(): void
    {
        $response = $this->postJson('/api/v1/employees', [
            'code' => 'EMP-USR-001',
            'first_name' => 'Carlos',
            'last_name' => 'Mendoza',
            'role' => 'COOK',
            'email' => 'carlos@sushigo.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(201);

        $employee = Employee::where('code', 'EMP-USR-001')->first();
        $this->assertNotNull($employee->user_id);

        $user = User::find($employee->user_id);
        $this->assertTrue($user->hasRole('employee'));
    }

    #[Test]
    public function it_creates_manager_with_employee_manager_spatie_role(): void
    {
        $response = $this->postJson('/api/v1/employees', [
            'code' => 'EMP-MGR-001',
            'first_name' => 'Ana',
            'last_name' => 'Garcia',
            'role' => 'MANAGER',
            'email' => 'ana.garcia@sushigo.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(201);

        $employee = Employee::where('code', 'EMP-MGR-001')->first();
        $user = User::find($employee->user_id);
        $this->assertTrue($user->hasRole('employee-manager'));
    }

    #[Test]
    public function it_rejects_duplicate_email_when_creating_employee(): void
    {
        User::factory()->create(['email' => 'taken@sushigo.com']);

        $response = $this->postJson('/api/v1/employees', [
            'code' => 'EMP-DUP',
            'first_name' => 'Test',
            'last_name' => 'User',
            'role' => 'COOK',
            'email' => 'taken@sushigo.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    #[Test]
    public function it_rejects_duplicate_phone_when_creating_employee(): void
    {
        User::factory()->create(['phone' => '+525599990000']);

        $response = $this->postJson('/api/v1/employees', [
            'code' => 'EMP-DUP-P',
            'first_name' => 'Test',
            'last_name' => 'User',
            'role' => 'COOK',
            'phone' => '+525599990000',
            'password' => 'password123',
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
            'role' => 'COOK',
            'email' => 'rollback@sushigo.com',
            'password' => 'password123',
        ]);

        // Should fail on duplicate code validation
        $response->assertStatus(422);

        // User should NOT have been created
        $this->assertDatabaseMissing('users', [
            'email' => 'rollback@sushigo.com',
        ]);
    }
}
