<?php

namespace App\Policies;

use App\Models\CashExpense;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class CashExpensePolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->can('cash_expenses.view');
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, CashExpense $cashExpense): bool
    {
        if (!$user->can('cash_expenses.view')) {
            return false;
        }

        return $this->userHasBranchAccess($user, $cashExpense->cashSession->cashRegister->branch_id);
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->can('cash_expenses.create');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, CashExpense $cashExpense): bool
    {
        if (!$user->can('cash_expenses.update')) {
            return false;
        }

        if ($cashExpense->isPosted()) {
            return false;
        }

        return $this->userHasBranchAccess($user, $cashExpense->cashSession->cashRegister->branch_id);
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, CashExpense $cashExpense): bool
    {
        if (!$user->can('cash_expenses.delete')) {
            return false;
        }

        if ($cashExpense->isPosted()) {
            return false;
        }

        return $this->userHasBranchAccess($user, $cashExpense->cashSession->cashRegister->branch_id);
    }

    /**
     * Determine whether the user can post the expense.
     */
    public function post(User $user, CashExpense $cashExpense): bool
    {
        if (!$user->can('cash_expenses.post')) {
            return false;
        }

        if ($cashExpense->isPosted()) {
            return false;
        }

        return $this->userHasBranchAccess($user, $cashExpense->cashSession->cashRegister->branch_id);
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
    public function restore(User $user, CashExpense $cashExpense): bool
    {
        return false;
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, CashExpense $cashExpense): bool
    {
        return false;
    }
}
