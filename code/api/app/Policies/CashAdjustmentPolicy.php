<?php

namespace App\Policies;

use App\Models\CashAdjustment;
use App\Models\User;
use App\Policies\Concerns\ChecksBranchAccess;

class CashAdjustmentPolicy
{
    use ChecksBranchAccess;

    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->can('cash_adjustments.view');
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, CashAdjustment $cashAdjustment): bool
    {
        if (! $user->can('cash_adjustments.view')) {
            return false;
        }

        return $this->userHasBranchAccess($user, $cashAdjustment->cashSession->cashRegister->branch_id);
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->can('cash_adjustments.create');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, CashAdjustment $cashAdjustment): bool
    {
        if (! $user->can('cash_adjustments.update')) {
            return false;
        }

        if ($cashAdjustment->isPosted()) {
            return false;
        }

        return $this->userHasBranchAccess($user, $cashAdjustment->cashSession->cashRegister->branch_id);
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, CashAdjustment $cashAdjustment): bool
    {
        if (! $user->can('cash_adjustments.delete')) {
            return false;
        }

        if ($cashAdjustment->isPosted()) {
            return false;
        }

        return $this->userHasBranchAccess($user, $cashAdjustment->cashSession->cashRegister->branch_id);
    }

    /**
     * Determine whether the user can post the adjustment.
     */
    public function post(User $user, CashAdjustment $cashAdjustment): bool
    {
        if (! $user->can('cash_adjustments.post')) {
            return false;
        }

        if ($cashAdjustment->isPosted()) {
            return false;
        }

        return $this->userHasBranchAccess($user, $cashAdjustment->cashSession->cashRegister->branch_id);
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
