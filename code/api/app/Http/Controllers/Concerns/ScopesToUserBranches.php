<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Http\Request;
use Illuminate\Support\Collection;

/**
 * Scopes a List query to the requesting user's active branch assignments
 * (see #295 — List endpoints previously returned every branch's records,
 * unlike Show/Update/Delete/Post which already scope via ChecksBranchAccess).
 */
trait ScopesToUserBranches
{
    /**
     * @return Collection<int, int>
     */
    protected function userBranchIds(Request $request): Collection
    {
        return $request->user()->operatingUnits()
            ->wherePivot('is_active', true)
            ->pluck('branch_id');
    }
}
