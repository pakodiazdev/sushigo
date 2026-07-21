<?php

namespace Tests\Feature\Employees;

use App\Models\Employee;
use App\Models\EmploymentPeriod;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class GetMyEmployeeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        foreach (Employee::POSITION_ROLES as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);
        }
    }

    #[Test]
    public function it_returns_the_employee_linked_to_the_authenticated_user(): void
    {
        $user = User::factory()->create();
        $employee = Employee::factory()->create(['user_id' => $user->id]);
        EmploymentPeriod::factory()->forEmployee($employee)->create(['is_active' => true]);

        Passport::actingAs($user);

        $response = $this->getJson('/api/v1/employees/me');

        $response->assertOk()
            ->assertJsonPath('data.id', $employee->public_id)
            ->assertJsonPath('data.first_name', $user->first_name)
            ->assertJsonPath('data.last_name', $user->last_name);
    }

    #[Test]
    public function it_returns_404_when_authenticated_user_has_no_linked_employee(): void
    {
        $user = User::factory()->create();

        Passport::actingAs($user);

        $response = $this->getJson('/api/v1/employees/me');

        $response->assertStatus(404)
            ->assertJsonPath('message', 'No existe un empleado vinculado a tu cuenta.');
    }

    #[Test]
    public function it_returns_401_for_unauthenticated_request(): void
    {
        app('auth')->forgetGuards();

        $this->getJson('/api/v1/employees/me')
            ->assertStatus(401);
    }

    #[Test]
    public function it_does_not_return_another_users_employee(): void
    {
        $otherUser = User::factory()->create();
        Employee::factory()->create(['user_id' => $otherUser->id]);

        $currentUser = User::factory()->create();

        Passport::actingAs($currentUser);

        $response = $this->getJson('/api/v1/employees/me');

        $response->assertStatus(404);
    }
}
