<?php

declare(strict_types=1);

namespace App\Http\Requests\Inventory\Concerns;

use App\Support\Access\OperatingUnitScope;
use Illuminate\Database\Query\Builder;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Exists;

/**
 * Shared existence rule for an Inventory Location public_id supplied as a *list
 * filter*.
 *
 * The Location must exist, not be soft-deleted, and — for a scoped caller —
 * belong to one of their accessible Operating Units. Enforcing the unit
 * constraint at validation time keeps the filter from leaking which
 * out-of-scope Location ULIDs exist: an inaccessible ULID must 422 exactly like
 * a nonexistent one (#574, mirroring the Purchase Receipt list #586).
 *
 * Bypass roles (`super-admin` / `admin`) keep the unconstrained check.
 */
trait ScopesLocationFilterToAccessibleUnits
{
    protected function accessibleLocationFilterRule(): Exists
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
