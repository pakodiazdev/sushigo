<?php

namespace App\Policies;

use App\Models\InventoryLocation;
use App\Models\User;

class InventoryLocationPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(?User $user): bool
    {
        return $user !== null && $user->can('inventory_locations.view');
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(?User $user, ?InventoryLocation $inventoryLocation = null): bool // NOSONAR - $inventoryLocation required by Laravel's policy contract; unused because authorization here is permission-only, no per-instance check; nullable so a class-string Gate check (no instance) is denied instead of crashing
    {
        return $user !== null && $user->can('inventory_locations.view');
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(?User $user): bool
    {
        return $user !== null && $user->can('inventory_locations.manage');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(?User $user, ?InventoryLocation $inventoryLocation = null): bool // NOSONAR - $inventoryLocation required by Laravel's policy contract; unused because authorization here is permission-only, no per-instance check; nullable so a class-string Gate check (no instance) is denied instead of crashing
    {
        return $user !== null && $user->can('inventory_locations.manage');
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(?User $user, ?InventoryLocation $inventoryLocation = null): bool // NOSONAR - $inventoryLocation required by Laravel's policy contract; unused because authorization here is permission-only, no per-instance check; nullable so a class-string Gate check (no instance) is denied instead of crashing
    {
        return $user !== null && $user->can('inventory_locations.manage');
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(?User $user, ?InventoryLocation $inventoryLocation = null): bool // NOSONAR - $inventoryLocation required by Laravel's policy contract; unused because authorization here is permission-only, no per-instance check; nullable so a class-string Gate check (no instance) is denied instead of crashing
    {
        return $user !== null && $user->can('inventory_locations.manage');
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(?User $user, ?InventoryLocation $inventoryLocation = null): bool // NOSONAR - $inventoryLocation required by Laravel's policy contract; unused because authorization here is permission-only, no per-instance check; nullable so a class-string Gate check (no instance) is denied instead of crashing
    {
        return $user !== null && $user->can('inventory_locations.manage');
    }
}
