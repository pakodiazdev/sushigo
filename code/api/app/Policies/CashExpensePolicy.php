<?php

namespace App\Policies;

use App\Models\CashExpense;
use App\Models\User;
use App\Policies\Concerns\ChecksBranchAccess;

class CashExpensePolicy
{
    use ChecksBranchAccess;

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
        if (! $user->can('cash_expenses.view')) {
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
        if (! $user->can('cash_expenses.update')) {
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
        if (! $user->can('cash_expenses.delete')) {
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
        if (! $user->can('cash_expenses.post')) {
            return false;
        }

        if ($cashExpense->isPosted()) {
            return false;
        }

        return $this->userHasBranchAccess($user, $cashExpense->cashSession->cashRegister->branch_id);
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(): bool
    {
        return false;
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(): bool
    {
        return false;
    }
}
