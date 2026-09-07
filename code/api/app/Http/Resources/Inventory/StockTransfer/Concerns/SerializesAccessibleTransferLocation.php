<?php

declare(strict_types=1);

namespace App\Http\Resources\Inventory\StockTransfer\Concerns;

use App\Models\InventoryLocation;
use App\Support\Access\OperatingUnitScope;
use Illuminate\Http\Request;

/**
 * A cross-unit Transfer is readable when *one* endpoint is in the caller's
 * accessible Operating Units (`OperatingUnitScope::canAccessStockTransfer` /
 * `constrainStockTransfers` use an OR) — but the endpoint the caller cannot
 * reach must not leak its name or public ID, exactly like the Stock Movement
 * ledger's foreign-unit masking (#574). This nulls that endpoint out so it
 * serializes identically to a genuinely absent relation. A no-op for
 * bypass-role callers.
 */
trait SerializesAccessibleTransferLocation
{
    /**
     * @return array{id: string, name: string}|null
     */
    protected function accessibleLocationRef(?InventoryLocation $location, Request $request): ?array
    {
        if ($location === null) {
            return null;
        }

        $user = $request->user();

        if ($user !== null && ! app(OperatingUnitScope::class)->canAccessLocation($user, $location)) {
            return null;
        }

        return [
            'id' => $location->public_id,
            'name' => $location->name,
        ];
    }
}
