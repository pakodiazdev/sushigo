<?php

namespace App\Policies;

use App\Models\InventoryLocation;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class InventoryLocationPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(?User $user): bool
    {
        // Public endpoint - anyone can list inventory locations
        return true;
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(?User $user, InventoryLocation $inventoryLocation): bool
    {
        // Public endpoint - anyone can view inventory locations
        return true;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        // Any authenticated user can create inventory locations
        return true;
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, InventoryLocation $inventoryLocation): bool
    {
        // Any authenticated user can update inventory locations
        return true;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, InventoryLocation $inventoryLocation): bool
    {
        // Any authenticated user can delete inventory locations
        return true;
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, InventoryLocation $inventoryLocation): bool
    {
        return true;
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, InventoryLocation $inventoryLocation): bool
    {
        return true;
    }
}
