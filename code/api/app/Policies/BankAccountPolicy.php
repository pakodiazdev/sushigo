<?php

namespace App\Policies;

use App\Models\BankAccount;
use App\Models\User;

class BankAccountPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->can('bank_accounts.view');
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, BankAccount $bankAccount): bool
    {
        if (! $user->can('bank_accounts.view')) {
            return false;
        }

        return $this->userHasBranchAccess($user, $bankAccount->branch_id);
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->can('bank_accounts.create');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, BankAccount $bankAccount): bool
    {
        if (! $user->can('bank_accounts.update')) {
            return false;
        }

        return $this->userHasBranchAccess($user, $bankAccount->branch_id);
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, BankAccount $bankAccount): bool
    {
        if (! $user->can('bank_accounts.delete')) {
            return false;
        }

        return $this->userHasBranchAccess($user, $bankAccount->branch_id);
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
    public function restore(User $user, BankAccount $bankAccount): bool
    {
        return false;
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, BankAccount $bankAccount): bool
    {
        return false;
    }
}
