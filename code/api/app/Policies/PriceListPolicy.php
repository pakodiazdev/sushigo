<?php

namespace App\Policies;

use App\Models\PriceList;
use App\Models\User;

/**
 * A PriceList is a shared container that can be assigned to many branches —
 * it is not itself branch-owned, so authorization here is permission-only.
 * Branch-scoped authorization lives on PriceListAssignmentPolicy instead.
 */
class PriceListPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('price_lists.view');
    }

    public function view(User $user, ?PriceList $priceList = null): bool // NOSONAR - $priceList required by Laravel's policy contract; unused because authorization here is permission-only, no per-instance check; nullable so a class-string Gate check (no instance) is denied instead of crashing
    {
        return $user->can('price_lists.view');
    }

    public function create(User $user): bool
    {
        return $user->can('price_lists.create');
    }

    public function update(User $user, ?PriceList $priceList = null): bool // NOSONAR - same as view()
    {
        return $user->can('price_lists.update');
    }

    public function delete(User $user, ?PriceList $priceList = null): bool // NOSONAR - same as view()
    {
        return $user->can('price_lists.delete');
    }
}
