<?php

namespace App\Policies\Concerns;

use App\Models\User;

trait ChecksBranchAccess
{
    /**
     * Whether the user has an active operating-unit assignment within the
     * given branch. Used by CashAdjustments policies to scope access to a
     * resource's branch.
     */
    private function userHasBranchAccess(User $user, int $branchId): bool
    {
        return $user->operatingUnits()
            ->wherePivot('is_active', true)
            ->where('branch_id', $branchId)
            ->exists();
    }
}
