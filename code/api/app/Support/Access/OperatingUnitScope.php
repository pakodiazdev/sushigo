<?php

namespace App\Support\Access;

use App\Models\InventoryLocation;
use App\Models\OperatingUnit;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

/**
 * Single source of truth for horizontal (Operating Unit) authorization across
 * the Inventory domain (#440).
 *
 * A global capability (`inventory_locations.*`, `stock.*`, ...) says *what* a
 * user may do; this class says *where*. A user may only read or mutate scoped
 * Inventory data belonging to an Operating Unit they hold an **active**
 * `operating_unit_users` membership in — unless they carry a bypass role
 * (`super-admin` / `admin`), which grants access to every unit.
 *
 * Every layer that needs the contract (policies, controllers, FormRequests,
 * services) delegates here rather than re-deriving the rule, so the bypass and
 * membership semantics stay identical everywhere.
 */
class OperatingUnitScope
{
    /**
     * Roles that bypass Operating Unit membership entirely. These users still
     * need the relevant functional permission, but are never scoped to a
     * subset of units. Kept explicit (not `$user->hasRole('super-admin')`
     * scattered across call sites) so "admin sees everything" is a documented,
     * tested decision rather than an implicit side effect of the seeders
     * assigning admins to every unit.
     */
    public const BYPASS_ROLES = ['super-admin', 'admin'];

    /**
     * Whether the user bypasses Operating Unit scoping altogether.
     */
    public function hasUnrestrictedAccess(User $user): bool
    {
        return $user->hasRole(self::BYPASS_ROLES);
    }

    /**
     * The Operating Unit IDs the user may act within. Bypass-role users get
     * every unit; everyone else gets only their active memberships.
     *
     * @return Collection<int, int>
     */
    public function accessibleOperatingUnitIds(User $user): Collection
    {
        if ($this->hasUnrestrictedAccess($user)) {
            return OperatingUnit::query()->pluck('id');
        }

        return $user->operatingUnits()
            ->wherePivot('is_active', true)
            ->pluck('operating_units.id');
    }

    /**
     * Whether the user may act within the given Operating Unit.
     */
    public function canAccessOperatingUnit(User $user, int $operatingUnitId): bool
    {
        if ($this->hasUnrestrictedAccess($user)) {
            return true;
        }

        return $user->operatingUnits()
            ->wherePivot('is_active', true)
            ->whereKey($operatingUnitId)
            ->exists();
    }

    /**
     * Whether the user may act on the given Inventory Location, resolved
     * through its owning Operating Unit. Accepts a model, a primary key, or
     * a public_id string so callers can check before or after resolving the
     * route/input identifier.
     */
    public function canAccessLocation(User $user, InventoryLocation|int|string|null $location): bool
    {
        $operatingUnitId = $this->resolveLocationOperatingUnitId($location);

        return $operatingUnitId !== null
            && $this->canAccessOperatingUnit($user, $operatingUnitId);
    }

    /**
     * Assert the user may act on the given Inventory Location, throwing a 403
     * otherwise. Movement/transfer flows call this once per location they
     * touch (source and destination), so both ends are validated under the
     * same rule.
     *
     * @throws AuthorizationException
     */
    public function assertCanAccessLocation(User $user, InventoryLocation|int|string|null $location): void
    {
        if (! $this->canAccessLocation($user, $location)) {
            throw new AuthorizationException(
                'You do not have access to the operating unit that owns this inventory location.'
            );
        }
    }

    /**
     * Constrain an InventoryLocation query to the user's accessible units.
     * A no-op for bypass-role users.
     *
     * @param  Builder<InventoryLocation>  $query
     * @return Builder<InventoryLocation>
     */
    public function constrainLocations(Builder $query, User $user): Builder
    {
        if ($this->hasUnrestrictedAccess($user)) {
            return $query;
        }

        return $query->whereIn('operating_unit_id', $this->accessibleOperatingUnitIds($user));
    }

    /**
     * Constrain a Stock query to the user's accessible units, via the
     * inventoryLocation relation. A no-op for bypass-role users.
     *
     * @param  Builder<\App\Models\Stock>  $query
     * @return Builder<\App\Models\Stock>
     */
    public function constrainStock(Builder $query, User $user): Builder
    {
        if ($this->hasUnrestrictedAccess($user)) {
            return $query;
        }

        $unitIds = $this->accessibleOperatingUnitIds($user);

        return $query->whereHas(
            'inventoryLocation',
            fn (Builder $locationQuery) => $locationQuery->whereIn('operating_unit_id', $unitIds)
        );
    }

    /**
     * Constrain a Receipt query to the user's accessible units, via the
     * receiving destinationLocation relation. A no-op for bypass-role users.
     *
     * Purchase Receipts are an append-only operational history whose read
     * path (#586) paginates and counts *after* this scope, so page metadata
     * never leaks the existence or count of receipts in units the caller
     * cannot access. #572 layers its receiving-Location routing contract on
     * top of this same relation without touching the list pipeline.
     *
     * @param  Builder<\App\Models\Receipt>  $query
     * @return Builder<\App\Models\Receipt>
     */
    public function constrainReceipts(Builder $query, User $user): Builder
    {
        if ($this->hasUnrestrictedAccess($user)) {
            return $query;
        }

        $unitIds = $this->accessibleOperatingUnitIds($user);

        return $query->whereHas(
            'destinationLocation',
            fn (Builder $locationQuery) => $locationQuery->whereIn('operating_unit_id', $unitIds)
        );
    }

    /**
     * Constrain a StockMovement query to the user's accessible units. A
     * movement is in scope when *either* its source or destination Location
     * belongs to an accessible unit — the immutable ledger read model (#574)
     * never surfaces a movement whose only touched Location is foreign. A
     * no-op for bypass-role users. Soft-deleted Locations still resolve to
     * their owning unit so a movement is not hidden once its Location is
     * archived.
     *
     * @param  Builder<StockMovement>  $query
     * @return Builder<StockMovement>
     */
    public function constrainStockMovements(Builder $query, User $user): Builder
    {
        if ($this->hasUnrestrictedAccess($user)) {
            return $query;
        }

        $unitIds = $this->accessibleOperatingUnitIds($user);

        $inUnit = fn (Builder $locationQuery) => $locationQuery
            ->withTrashed()
            ->whereIn('operating_unit_id', $unitIds);

        return $query->where(fn (Builder $scoped) => $scoped
            ->whereHas('fromLocation', $inUnit)
            ->orWhereHas('toLocation', $inUnit));
    }

    /**
     * Whether the user may read the given StockMovement, resolved through
     * either of its touched Locations (source or destination). Soft-deleted
     * Locations are considered, so an archived Location does not 403 its own
     * unit's members out of the immutable history.
     */
    public function canAccessStockMovement(User $user, StockMovement $movement): bool
    {
        if ($this->hasUnrestrictedAccess($user)) {
            return true;
        }

        $locationIds = array_values(array_filter([
            $movement->from_location_id,
            $movement->to_location_id,
        ]));

        if ($locationIds === []) {
            return false;
        }

        $movementUnitIds = InventoryLocation::withTrashed()
            ->whereKey($locationIds)
            ->pluck('operating_unit_id');

        return $movementUnitIds
            ->intersect($this->accessibleOperatingUnitIds($user))
            ->isNotEmpty();
    }

    /**
     * Assert the user may read the given StockMovement, throwing a 403
     * otherwise.
     *
     * @throws AuthorizationException
     */
    public function assertCanAccessStockMovement(User $user, StockMovement $movement): void
    {
        if (! $this->canAccessStockMovement($user, $movement)) {
            throw new AuthorizationException(
                'You do not have access to the operating unit that owns this stock movement.'
            );
        }
    }

    private function resolveLocationOperatingUnitId(InventoryLocation|int|string|null $location): ?int
    {
        if ($location === null) {
            return null;
        }

        if ($location instanceof InventoryLocation) {
            return $location->operating_unit_id === null ? null : (int) $location->operating_unit_id;
        }

        $column = is_int($location) || ctype_digit((string) $location) ? 'id' : 'public_id';

        $operatingUnitId = InventoryLocation::query()
            ->where($column, $location)
            ->value('operating_unit_id');

        return $operatingUnitId === null ? null : (int) $operatingUnitId;
    }
}
