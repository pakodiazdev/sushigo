<?php

namespace App\Policies;

use App\Models\ItemVariant;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class ItemVariantPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(?User $user): bool
    {
        // Public endpoint - anyone can list item variants
        return true;
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(?User $user, ItemVariant $itemVariant): bool
    {
        // Public endpoint - anyone can view item variants
        return true;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        // Any authenticated user can create item variants
        return true;
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, ItemVariant $itemVariant): bool
    {
        // Any authenticated user can update item variants
        return true;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, ItemVariant $itemVariant): bool
    {
        // Any authenticated user can delete item variants
        return true;
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, ItemVariant $itemVariant): bool
    {
        return true;
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, ItemVariant $itemVariant): bool
    {
        return true;
    }
}
