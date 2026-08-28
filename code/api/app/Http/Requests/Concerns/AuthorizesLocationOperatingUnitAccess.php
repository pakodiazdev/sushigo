<?php

namespace App\Http\Requests\Concerns;

use App\Models\InventoryLocation;
use App\Models\User;
use App\Support\Access\OperatingUnitScope;

/**
 * Shared `authorize()` helper for stock movement FormRequests (#440): once the
 * functional permission passes, the location a movement touches must belong to
 * an Operating Unit the caller has active membership in (bypass roles excepted).
 *
 * An unknown/blank `inventory_location_id` is intentionally allowed through so
 * `rules()` reports it as a normal 422 `exists` failure rather than a
 * misleading 403.
 */
trait AuthorizesLocationOperatingUnitAccess
{
    protected function callerCanAccessMovementLocation(string $inputKey = 'inventory_location_id'): bool
    {
        $publicId = $this->input($inputKey);

        if (! is_string($publicId) || $publicId === '') {
            return true;
        }

        $operatingUnitId = InventoryLocation::query()
            ->where('public_id', $publicId)
            ->value('operating_unit_id');

        if ($operatingUnitId === null) {
            return true;
        }

        /** @var User $user */
        $user = $this->user();

        return app(OperatingUnitScope::class)
            ->canAccessOperatingUnit($user, (int) $operatingUnitId);
    }
}
