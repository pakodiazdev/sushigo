<?php

declare(strict_types=1);

namespace App\Http\Requests\Inventory\StockTransfer\Concerns;

use App\Support\Access\OperatingUnitScope;
use Illuminate\Database\Query\Builder;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Exists;

/**
 * Shared `inventory_locations` existence rule for the Stock Transfer requests,
 * scoped — for a non-bypass caller — to their accessible Operating Units.
 *
 * Enforcing the unit constraint at validation time (not only in a controller
 * guard on the *current* record) means a create/update payload can never route
 * a Transfer endpoint into a unit the caller cannot act in, and a list filter
 * never leaks which out-of-scope Location ULIDs exist — an inaccessible ULID
 * 422s exactly like a nonexistent one. Bypass roles keep the unconstrained
 * check.
 */
trait ScopesLocationToAccessibleUnits
{
    protected function accessibleLocationRule(): Exists
    {
        $rule = Rule::exists('inventory_locations', 'public_id')->withoutTrashed();

        $scope = app(OperatingUnitScope::class);
        $user = $this->user();

        if ($user !== null && ! $scope->hasUnrestrictedAccess($user)) {
            $unitIds = $scope->accessibleOperatingUnitIds($user)->all();
            $rule->where(fn (Builder $query) => $query->whereIn('operating_unit_id', $unitIds));
        }

        return $rule;
    }
}
