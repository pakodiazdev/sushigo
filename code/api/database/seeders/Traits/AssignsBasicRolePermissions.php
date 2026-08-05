<?php

namespace Database\Seeders\Traits;

use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

trait AssignsBasicRolePermissions
{
    /**
     * Self-service Solicitudes access — every employee can view/create/cancel
     * their own requests, including self-service vacation requests, but never
     * approve or directly schedule vacations on behalf of someone else (that
     * stays admin-only). Owned by this trait — rather than redeclared by each
     * using class — since assignBasicRolesPermissions() below depends on it.
     */
    private const SELF_SERVICE_REQUESTS_PERMISSIONS = [
        'employee-requests.view',
        'employee-requests.create',
        'employee-requests.cancel',
    ];

    /**
     * cook, kitchen-assistant, delivery-driver, acting-manager: basic user access
     * plus self-service Solicitudes (view/create/cancel their own requests —
     * never approve, that stays manager/admin-only). Identical across
     * Development and Production — only the permission set's metadata differs.
     */
    private function assignBasicRolesPermissions(): void
    {
        foreach (['cook', 'kitchen-assistant', 'delivery-driver', 'acting-manager'] as $roleName) {
            $role = Role::where('name', $roleName)->where('guard_name', 'api')->first();
            if ($role) {
                $role->syncPermissions(
                    Permission::where('guard_name', 'api')
                        ->where(function ($q) {
                            $q->whereIn('name', ['users.show', 'users.index'])
                                ->orWhereIn('name', self::SELF_SERVICE_REQUESTS_PERMISSIONS);
                        })
                        ->get()
                );
            }
        }
    }
}
