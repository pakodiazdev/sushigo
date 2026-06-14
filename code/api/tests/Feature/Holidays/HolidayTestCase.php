<?php

namespace Tests\Feature\Holidays;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * Base class for Holiday feature tests.
 */
abstract class HolidayTestCase extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
    }

    /**
     * Create a user with the given permissions, act as them via Passport.
     *
     * @param  string[]  $permissions
     */
    protected function makeUserWithPermissions(array $permissions): User
    {
        foreach ($permissions as $perm) {
            Permission::firstOrCreate(['name' => $perm, 'guard_name' => 'api']);
        }

        $role = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'api']);
        $role->givePermissionTo($permissions);

        $user = User::factory()->create();
        $user->assignRole('admin');

        Passport::actingAs($user);

        return $user;
    }

    /**
     * Create a user with no permissions, act as them.
     */
    protected function makeUserWithNoPermissions(): User
    {
        $user = User::factory()->create();
        Passport::actingAs($user);

        return $user;
    }
}
