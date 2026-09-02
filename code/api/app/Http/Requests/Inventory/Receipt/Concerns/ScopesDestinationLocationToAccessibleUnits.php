<?php

declare(strict_types=1);

namespace App\Http\Requests\Inventory\Receipt\Concerns;

use App\Support\Access\OperatingUnitScope;
use Illuminate\Database\Query\Builder;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Exists;

/**
 * Shared `destination_location_id` existence rule for the Purchase Receipt
 * requests (list filter + create/update payload).
 *
 * The location must exist, not be soft-deleted, and — for a scoped caller —
 * belong to one of their accessible Operating Units. Enforcing the unit
 * constraint at validation time (not only in a controller guard on the *current*
 * record) closes two holes:
 *
 *  - the list filter must not leak which out-of-scope location ULIDs exist — an
 *    inaccessible ULID must 422 exactly like a nonexistent one (#586);
 *  - a create/update payload must not route a Receipt into a unit the caller
 *    cannot act in (`assertReceiptInScope` only checks the Receipt's *old*
 *    destination, so without this an accessible draft could be transferred to a
 *    foreign unit).
 *
 * Bypass roles (`super-admin` / `admin`) keep the unconstrained check.
 */
trait ScopesDestinationLocationToAccessibleUnits
{
    protected function accessibleDestinationLocationRule(): Exists
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
