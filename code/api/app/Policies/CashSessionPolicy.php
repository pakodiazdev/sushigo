<?php

namespace App\Policies;

use App\Models\CashSession;
use App\Models\User;

class CashSessionPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->can('cash_sessions.view');
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, CashSession $cashSession): bool
    {
        if (! $user->can('cash_sessions.view')) {
            return false;
        }

        return $this->userHasBranchAccess($user, $cashSession->cashRegister->branch_id);
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->can('cash_sessions.create');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, CashSession $cashSession): bool
    {
        if (! $user->can('cash_sessions.update')) {
            return false;
        }

        if ($cashSession->isPosted()) {
            return false;
        }

        return $this->userHasBranchAccess($user, $cashSession->cashRegister->branch_id);
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, CashSession $cashSession): bool
    {
        return false; // Sessions should not be deleted
    }

    /**
     * Determine whether the user can post the session.
     */
    public function post(User $user, CashSession $cashSession): bool
    {
        if (! $user->can('cash_sessions.post')) {
            return false;
        }

        if ($cashSession->isPosted()) {
            return false;
        }

        return $this->userHasBranchAccess($user, $cashSession->cashRegister->branch_id);
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
    public function restore(User $user, CashSession $cashSession): bool
    {
        return false;
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, CashSession $cashSession): bool
    {
        return false;
    }
}
