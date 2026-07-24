<?php

namespace Tests\Feature\CashAdjustments\Concerns;

use App\Models\Branch;
use App\Models\OperatingUnit;
use App\Models\User;
use Laravel\Passport\Passport;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

trait SetsUpBranchAccess
{
    /**
     * Create a user with the given permission(s) and an active operating-unit
     * assignment within $branch, then authenticate as them via Passport.
     *
     * @param  string|list<string>  $permissions
     */
    private function actingAsUserWithBranchAccess(Branch $branch, string|array $permissions): User
    {
        $user = $this->userWithPermissions($permissions);

        $operatingUnit = OperatingUnit::create([
            'branch_id' => $branch->id,
            'name' => 'Test Operating Unit',
            'type' => OperatingUnit::TYPE_BRANCH_MAIN,
            'is_active' => true,
        ]);

        $user->operatingUnits()->attach($operatingUnit->id, [
            'assignment_role' => 'OWNER',
            'is_active' => true,
        ]);

        Passport::actingAs($user);

        return $user;
    }

    /**
     * Create a user with the given permission(s) but no operating-unit
     * assignment for any branch — used to assert 403 on branch-scoped access.
     *
     * @param  string|list<string>  $permissions
     */
    private function actingAsUserWithoutBranchAccess(string|array $permissions): User
    {
        $user = $this->userWithPermissions($permissions);

        Passport::actingAs($user);

        return $user;
    }

    /**
     * @param  string|list<string>  $permissions
     */
    private function userWithPermissions(string|array $permissions): User
    {
        $role = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'api']);

        foreach ((array) $permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'api']);
            $role->givePermissionTo($permission);
        }

        $user = User::factory()->create();
        $user->assignRole('admin');

        return $user;
    }
}
