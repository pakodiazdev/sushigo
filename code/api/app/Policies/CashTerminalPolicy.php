<?php

namespace App\Policies;

use App\Models\CashTerminal;
use App\Models\User;

class CashTerminalPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->can('cash_terminals.view');
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, CashTerminal $cashTerminal): bool
    {
        if (! $user->can('cash_terminals.view')) {
            return false;
        }

        return $this->userHasBranchAccess($user, $cashTerminal->branch_id);
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->can('cash_terminals.create');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, CashTerminal $cashTerminal): bool
    {
        if (! $user->can('cash_terminals.update')) {
            return false;
        }

        return $this->userHasBranchAccess($user, $cashTerminal->branch_id);
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, CashTerminal $cashTerminal): bool
    {
        if (! $user->can('cash_terminals.delete')) {
            return false;
        }

        return $this->userHasBranchAccess($user, $cashTerminal->branch_id);
    }

    /**
     * Check if user has access to the branch
     */
    private function userHasBranchAccess(User $user, int $branchId): bool
    {
        return $user->operatingUnitUsers()
            ->whereHas('operatingUnit', function ($query) use ($branchId) {
                $query->where('branch_id', $branchId);
            })
            ->exists();
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, CashTerminal $cashTerminal): bool
    {
        return false;
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, CashTerminal $cashTerminal): bool
    {
        return false;
    }
}
