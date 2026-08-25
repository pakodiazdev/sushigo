<?php

namespace App\Policies;

use App\Models\PriceListAssignment;
use App\Models\User;
use App\Policies\Concerns\ChecksBranchAccess;

/**
 * The branch-scoped resource in the Pricing domain (#435) — this is what
 * satisfies "authorization prevents cross-context price management".
 * Mirrors CashRegisterPolicy exactly: viewAny/create are permission-only
 * (there's no instance/branch to check yet), view/update/delete additionally
 * require an active OperatingUnit assignment in the assignment's own branch.
 */
class PriceListAssignmentPolicy
{
    use ChecksBranchAccess;

    public function viewAny(User $user): bool
    {
        return $user->can('price_list_assignments.view');
    }

    public function view(User $user, PriceListAssignment $priceListAssignment): bool
    {
        if (! $user->can('price_list_assignments.view')) {
            return false;
        }

        return $this->userHasBranchAccess($user, $priceListAssignment->branch_id);
    }

    public function create(User $user): bool
    {
        return $user->can('price_list_assignments.create');
    }

    public function update(User $user, PriceListAssignment $priceListAssignment): bool
    {
        if (! $user->can('price_list_assignments.update')) {
            return false;
        }

        return $this->userHasBranchAccess($user, $priceListAssignment->branch_id);
    }

    public function delete(User $user, PriceListAssignment $priceListAssignment): bool
    {
        if (! $user->can('price_list_assignments.delete')) {
            return false;
        }

        return $this->userHasBranchAccess($user, $priceListAssignment->branch_id);
    }
}
