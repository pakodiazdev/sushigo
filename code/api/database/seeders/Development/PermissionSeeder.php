<?php

namespace Database\Seeders\Development;

use Database\Seeders\Base\LockedSeeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class PermissionSeeder extends LockedSeeder
{
    public function run(): void
    {
        $permissions = [
            'users.index',
            'users.show',
            'users.store',
            'users.update',
            'users.destroy',
            'roles.index',
            'roles.show',
            'roles.store',
            'roles.update',
            'roles.destroy',
            'permissions.index',
            'permissions.show',
        ];

        foreach ($permissions as $permission) {
            Permission::updateOrCreate(
                ['name' => $permission, 'guard_name' => 'api'],
                ['name' => $permission, 'guard_name' => 'api']
            );
        }

        $superAdminRole = Role::where('name', 'super-admin')
            ->where('guard_name', 'api')
            ->first();

        if ($superAdminRole) {
            $superAdminRole->syncPermissions(Permission::where('guard_name', 'api')->get());
        }

        $adminRole = Role::where('name', 'admin')
            ->where('guard_name', 'api')
            ->first();

        if ($adminRole) {
            $adminRole->syncPermissions(
                Permission::where('guard_name', 'api')
                    ->where('name', 'like', 'users.%')
                    ->get()
            );
        }

        $userRole = Role::where('name', 'user')
            ->where('guard_name', 'api')
            ->first();

        if ($userRole) {
            $userRole->syncPermissions(
                Permission::where('guard_name', 'api')
                    ->whereIn('name', ['users.show', 'users.index'])
                    ->get()
            );
        }

        $this->command->info('✓ Development permissions seeded successfully');
    }
}
