<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\StockMovement\Concerns;

use App\Models\StockMovement;
use App\Models\User;
use App\Support\Access\OperatingUnitScope;

/**
 * A cross-unit transfer becomes visible to a scoped caller because *one* of its
 * touched Locations is in an accessible Operating Unit (`constrainStockMovements`
 * uses an OR). The movement is legitimately theirs to see, but the issue's
 * contract also says a movement "must never leak a Location ... from another
 * unit" (#574) — so the endpoint the caller cannot reach is nulled out here,
 * before serialization, and the resource renders it exactly like a genuinely
 * external endpoint. Purely in memory: the location relations are already
 * eager-loaded, so this adds no queries. A no-op for bypass-role callers.
 */
trait MasksInaccessibleMovementLocations
{
    /**
     * @param  iterable<StockMovement>  $movements
     */
    protected function maskInaccessibleLocations(iterable $movements, OperatingUnitScope $scope, User $user): void
    {
        if ($scope->hasUnrestrictedAccess($user)) {
            return;
        }

        $accessibleUnitIds = $scope->accessibleOperatingUnitIds($user);

        foreach ($movements as $movement) {
            foreach (['fromLocation', 'toLocation'] as $relation) {
                if (! $movement->relationLoaded($relation)) {
                    continue;
                }

                $location = $movement->getRelation($relation);

                if ($location !== null && ! $accessibleUnitIds->contains((int) $location->operating_unit_id)) {
                    $movement->setRelation($relation, null);
                }
            }
        }
    }
}
