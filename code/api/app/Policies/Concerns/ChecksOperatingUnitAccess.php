<?php

namespace App\Policies\Concerns;

use App\Models\InventoryLocation;
use App\Models\User;
use App\Support\Access\OperatingUnitScope;

/**
 * Per-instance Operating Unit membership check for Inventory policies (#440).
 * Delegates to the centralized {@see OperatingUnitScope} so the bypass-role
 * and active-membership semantics stay identical to the controller/FormRequest
 * layers. Mirrors {@see ChecksBranchAccess}, one grain finer (unit, not branch).
 */
trait ChecksOperatingUnitAccess
{
    private function userCanAccessLocation(User $user, InventoryLocation $location): bool
    {
        return app(OperatingUnitScope::class)->canAccessLocation($user, $location);
    }
}
