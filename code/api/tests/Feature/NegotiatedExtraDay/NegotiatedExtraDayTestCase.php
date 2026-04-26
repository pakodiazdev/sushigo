<?php

namespace Tests\Feature\NegotiatedExtraDay;

use App\Models\Employee;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * Base class for NegotiatedExtraDay feature tests.
 *
 * Sets up the role rows that the Employee factory requires, so every
 * subclass gets a clean slate without repeating the same boilerplate.
 */
abstract class NegotiatedExtraDayTestCase extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Role::firstOrCreate(['name' => 'employee', 'guard_name' => 'api']);
        Role::firstOrCreate(['name' => 'employee-manager', 'guard_name' => 'api']);

        foreach (Employee::POSITION_ROLES as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);
        }
    }

    /**
     * Create (or reuse) the 'manager' role, grant it the given permissions,
     * create a User with that role, and act as that user via Passport.
     *
     * @param  string[]  $permissions
     */
    protected function makeManagerWithPermissions(array $permissions): User
    {
        foreach ($permissions as $perm) {
            Permission::firstOrCreate(['name' => $perm, 'guard_name' => 'api']);
        }

        $role = Role::firstOrCreate(['name' => 'manager', 'guard_name' => 'api']);
        $role->givePermissionTo($permissions);

        $user = User::factory()->create();
        $user->assignRole('manager');

        Passport::actingAs($user);

        return $user;
    }
}
