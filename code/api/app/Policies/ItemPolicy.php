<?php

namespace App\Policies;

use App\Models\User;

class ItemPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(?User $user): bool // NOSONAR - $user kept nullable so Gate::methodAllowsGuests() permits guest access
    {
        // Public endpoint - anyone can list items
        return true;
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(?User $user): bool // NOSONAR - $user kept nullable so Gate::methodAllowsGuests() permits guest access
    {
        // Public endpoint - anyone can view items
        return true;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(): bool
    {
        // Any authenticated user can create items
        // In production, you might want to check for specific roles/permissions
        return true;
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(): bool
    {
        // Any authenticated user can update items
        // In production, you might want to check for specific roles/permissions
        return true;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(): bool
    {
        // Any authenticated user can delete items
        // In production, you might want to check for specific roles/permissions
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
