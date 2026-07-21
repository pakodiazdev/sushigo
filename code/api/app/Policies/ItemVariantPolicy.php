<?php

namespace App\Policies;

use App\Models\User;

class ItemVariantPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(?User $user): bool // NOSONAR - $user kept nullable so Gate::methodAllowsGuests() permits guest access
    {
        // Public endpoint - anyone can list item variants
        return true;
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(?User $user): bool // NOSONAR - $user kept nullable so Gate::methodAllowsGuests() permits guest access
    {
        // Public endpoint - anyone can view item variants
        return true;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(): bool
    {
        // Any authenticated user can create item variants
        return true;
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(): bool
    {
        // Any authenticated user can update item variants
        return true;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(): bool
    {
        // Any authenticated user can delete item variants
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
