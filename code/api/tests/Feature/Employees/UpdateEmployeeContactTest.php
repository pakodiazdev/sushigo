<?php

namespace Tests\Feature\Employees;

use App\Models\Employee;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class UpdateEmployeeContactTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        Permission::create(['name' => 'employees.view', 'guard_name' => 'api']);
        Permission::create(['name' => 'employees.create', 'guard_name' => 'api']);
        Permission::create(['name' => 'employees.update', 'guard_name' => 'api']);

        $admin = Role::create(['name' => 'admin', 'guard_name' => 'api']);
        $admin->givePermissionTo(['employees.view', 'employees.create', 'employees.update']);

        $manager = Role::create(['name' => 'employee-manager', 'guard_name' => 'api']);
        $manager->givePermissionTo(['employees.view', 'employees.update']);
        
        // System roles needed for Employee.syncPositionRoles()
        Role::firstOrCreate(['name' => 'employee', 'guard_name' => 'api']);
        Role::firstOrCreate(['name' => 'employee-manager', 'guard_name' => 'api']);

        // Position roles (job titles) needed by factories
        foreach (Employee::POSITION_ROLES as $positionRole) {
            Role::firstOrCreate(['name' => $positionRole, 'guard_name' => 'api']);
        }
    }

    #[Test]
    public function admin_cannot_clear_both_email_and_phone(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        Passport::actingAs($admin);

        $user = User::factory()->create(['email' => 'a@x.com', 'phone' => '5512345678']);
        $employee = Employee::factory()->create(['user_id' => $user->id]);

        $response = $this->putJson("/api/v1/employees/{$employee->public_id}", [
            'email' => '',
            'phone' => '',
        ]);

        $response->assertStatus(422);
    }

    #[Test]
    public function admin_can_update_one_contact(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        Passport::actingAs($admin);

        $user = User::factory()->create(['email' => 'a@x.com', 'phone' => '5512345678']);
        $employee = Employee::factory()->create(['user_id' => $user->id]);

        $response = $this->putJson("/api/v1/employees/{$employee->public_id}", [
            'email' => 'new@x.com',
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('users', ['id' => $user->id, 'email' => 'new@x.com']);
    }

    #[Test]
    public function manager_cannot_change_email_or_user_id(): void
    {
        $manager = User::factory()->create();
        $manager->assignRole('employee-manager');
        Passport::actingAs($manager);

        $user = User::factory()->create(['email' => 'u@x.com', 'phone' => '5512345678']);
        $employee = Employee::factory()->create(['user_id' => $user->id]);

        $otherUser = User::factory()->create();

        $response = $this->putJson("/api/v1/employees/{$employee->public_id}", [
            'email' => 'hacker@x.com',
            'user_id' => $otherUser->id,
        ]);

        // Should either be forbidden or validation should ignore these fields; expect 200 but no changes
        $response->assertStatus(200);

        $this->assertDatabaseHas('users', ['id' => $user->id, 'email' => 'u@x.com']);
        $this->assertDatabaseHas('employees', ['id' => $employee->id, 'user_id' => $user->id]);
    }
}
