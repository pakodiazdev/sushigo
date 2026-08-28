<?php

namespace App\Policies;

use App\Models\InventoryLocation;
use App\Models\User;
use App\Policies\Concerns\ChecksOperatingUnitAccess;

class InventoryLocationPolicy
{
    use ChecksOperatingUnitAccess;

    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(?User $user): bool
    {
        return $user !== null && $user->can('inventory_locations.view');
    }

    /**
     * Determine whether the user can view the model.
     *
     * A class-string Gate check (no instance) is permission-only; a
     * per-instance check additionally requires active membership in the
     * location's Operating Unit (#440).
     */
    public function view(?User $user, ?InventoryLocation $inventoryLocation = null): bool
    {
        if ($user === null || ! $user->can('inventory_locations.view')) {
            return false;
        }

        return $inventoryLocation === null
            || $this->userCanAccessLocation($user, $inventoryLocation);
    }

    /**
     * Determine whether the user can create models.
     *
     * The target Operating Unit is validated in CreateInventoryLocationRequest,
     * which has the request body; the policy stays permission-only here.
     */
    public function create(?User $user): bool
    {
        return $user !== null && $user->can('inventory_locations.manage');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(?User $user, ?InventoryLocation $inventoryLocation = null): bool
    {
        return $this->canManage($user, $inventoryLocation);
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(?User $user, ?InventoryLocation $inventoryLocation = null): bool
    {
        return $this->canManage($user, $inventoryLocation);
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(?User $user, ?InventoryLocation $inventoryLocation = null): bool
    {
        return $this->canManage($user, $inventoryLocation);
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(?User $user, ?InventoryLocation $inventoryLocation = null): bool
    {
        return $this->canManage($user, $inventoryLocation);
    }

    /**
     * Shared rule for every mutating ability: the `inventory_locations.manage`
     * permission plus — for a per-instance check — active membership in the
     * location's Operating Unit (#440). A class-string Gate check (no instance)
     * stays permission-only, preserving #400's contract.
     */
    private function canManage(?User $user, ?InventoryLocation $inventoryLocation): bool
    {
        if ($user === null || ! $user->can('inventory_locations.manage')) {
            return false;
        }

        return $inventoryLocation === null
            || $this->userCanAccessLocation($user, $inventoryLocation);
    }
}
