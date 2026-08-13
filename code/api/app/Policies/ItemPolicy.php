<?php

namespace App\Policies;

use App\Models\Item;
use App\Models\User;

class ItemPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(?User $user): bool
    {
        return $user !== null && $user->can('items.view');
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(?User $user, ?Item $item = null): bool // NOSONAR - $item required by Laravel's policy contract; unused because authorization here is permission-only, no per-instance check; nullable so a class-string Gate check (no instance) is denied instead of crashing
    {
        return $user !== null && $user->can('items.view');
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(?User $user): bool
    {
        return $user !== null && $user->can('items.create');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(?User $user, ?Item $item = null): bool // NOSONAR - $item required by Laravel's policy contract; unused because authorization here is permission-only, no per-instance check; nullable so a class-string Gate check (no instance) is denied instead of crashing
    {
        return $user !== null && $user->can('items.update');
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(?User $user, ?Item $item = null): bool // NOSONAR - $item required by Laravel's policy contract; unused because authorization here is permission-only, no per-instance check; nullable so a class-string Gate check (no instance) is denied instead of crashing
    {
        return $user !== null && $user->can('items.delete');
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(?User $user, ?Item $item = null): bool // NOSONAR - $item required by Laravel's policy contract; unused because authorization here is permission-only, no per-instance check; nullable so a class-string Gate check (no instance) is denied instead of crashing
    {
        return $user !== null && $user->can('items.delete');
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(?User $user, ?Item $item = null): bool // NOSONAR - $item required by Laravel's policy contract; unused because authorization here is permission-only, no per-instance check; nullable so a class-string Gate check (no instance) is denied instead of crashing
    {
        return $user !== null && $user->can('items.delete');
    }
}
