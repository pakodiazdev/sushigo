<?php

namespace App\Policies;

use App\Models\CashAdjustment;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class CashAdjustmentPolicy
{
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
        if (!$user->can('cash_adjustments.view')) {
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
        if (!$user->can('cash_adjustments.update')) {
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
        if (!$user->can('cash_adjustments.delete')) {
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
        if (!$user->can('cash_adjustments.post')) {
            return false;
        }

        if ($cashAdjustment->isPosted()) {
            return false;
        }

        return $this->userHasBranchAccess($user, $cashAdjustment->cashSession->cashRegister->branch_id);
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
    public function restore(User $user, CashAdjustment $cashAdjustment): bool
    {
        return false;
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, CashAdjustment $cashAdjustment): bool
    {
        return false;
    }
}
