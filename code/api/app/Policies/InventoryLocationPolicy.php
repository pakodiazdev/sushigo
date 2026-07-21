<?php

namespace App\Policies;

use App\Models\User;

class InventoryLocationPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(?User $user): bool // NOSONAR - $user kept nullable so Gate::methodAllowsGuests() permits guest access
    {
        // Public endpoint - anyone can list inventory locations
        return true;
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(?User $user): bool // NOSONAR - $user kept nullable so Gate::methodAllowsGuests() permits guest access
    {
        // Public endpoint - anyone can view inventory locations
        return true;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(): bool
    {
        // Any authenticated user can create inventory locations
        return true;
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(): bool
    {
        // Any authenticated user can update inventory locations
        return true;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(): bool
    {
        // Any authenticated user can delete inventory locations
        return true;
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(): bool
    {
        return true;
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(): bool
    {
        return true;
    }
}
