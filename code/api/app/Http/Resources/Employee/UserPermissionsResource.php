<?php

namespace App\Http\Resources\Employee;

use App\Http\Resources\BaseResource;
use App\Models\User;
use Illuminate\Support\Collection;
use Spatie\Permission\Models\Permission;

/**
 * @mixin User
 *
 * @OA\Schema(
 *     schema="UserPermissionItem",
 *     title="User Permission Item",
 *
 *     @OA\Property(property="name",      type="string", example="employees.create"),
 *     @OA\Property(property="label",     type="string", example="Crear empleado"),
 *     @OA\Property(property="source",    type="string", enum={"role","direct","none"}, example="role"),
 *     @OA\Property(property="via_roles", type="array", @OA\Items(type="string"), example={"admin"})
 * )
 *
 * @OA\Schema(
 *     schema="UserPermissionGroup",
 *     title="User Permission Group",
 *
 *     @OA\Property(property="group",       type="string", example="Empleados"),
 *     @OA\Property(property="permissions", type="array", @OA\Items(ref="#/components/schemas/UserPermissionItem"))
 * )
 *
 * @OA\Schema(
 *     schema="UserPermissionsResponse",
 *     title="User Permissions Response",
 *
 *     @OA\Property(property="groups", type="array", @OA\Items(ref="#/components/schemas/UserPermissionGroup"))
 * )
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
            ->orderBy('group')
            ->orderBy('name')
            ->get();

        $groups = $allPermissions
            ->groupBy(fn (Permission $permission) => $permission->group ?: 'Otros')
            ->map(fn (Collection $permissions, string $group) => [
                'group' => $group,
                'permissions' => $permissions->map(fn (Permission $permission) => [
                    'name' => $permission->name,
                    'label' => $permission->label ?: $permission->name,
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
