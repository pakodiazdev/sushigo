<?php

namespace App\Http\Resources\Employee;

use App\Http\Resources\BaseResource;
use App\Models\User;
use Illuminate\Support\Collection;
use Spatie\Permission\Models\Permission;

/**
 * @mixin User
 */
class UserPermissionsResource extends BaseResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray($request): array
    {
        /** @var User $user */
        $user = $this->resource;

        $directPermissionNames = $user->getDirectPermissions()->pluck('name')->flip();

        $rolesByPermission = $this->buildRolesByPermissionMap($user);
        $rolePermissionNames = collect($rolesByPermission)->keys()->flip();

        $allPermissions = Permission::where('guard_name', 'api')
            ->whereNotNull('group')
            ->orderBy('group')
            ->orderBy('name')
            ->get();

        $groups = $allPermissions
            ->groupBy('group')
            ->map(fn (Collection $permissions, string $group) => [
                'group' => $group,
                'permissions' => $permissions->map(fn (Permission $permission) => [
                    'name' => $permission->name,
                    'label' => $permission->label,
                    'source' => $this->resolveSource($permission->name, $directPermissionNames, $rolePermissionNames),
                    'via_roles' => $rolesByPermission[$permission->name] ?? [],
                ])->values(),
            ])
            ->values();

        return [
            'groups' => $groups,
        ];
    }

    /**
     * Builds a map of permission name → list of role names that grant it.
     *
     * @return array<string, string[]>
     */
    private function buildRolesByPermissionMap(User $user): array
    {
        $map = [];

        foreach ($user->roles()->with('permissions')->get() as $role) {
            foreach ($role->permissions as $permission) {
                $map[$permission->name][] = $role->name;
            }
        }

        return $map;
    }

    /**
     * @param  Collection<string, int>  $directPermissionNames
     * @param  Collection<string, int>  $rolePermissionNames
     */
    private function resolveSource(
        string $name,
        Collection $directPermissionNames,
        Collection $rolePermissionNames
    ): string {
        if ($directPermissionNames->has($name)) {
            return 'direct';
        }

        if ($rolePermissionNames->has($name)) {
            return 'role';
        }

        return 'none';
    }
}
