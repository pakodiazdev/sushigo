<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\StockTransfer\Concerns;

use App\Models\StockTransfer;
use App\Support\Access\OperatingUnitScope;

/**
 * Horizontal-authorization guard for the by-ID Stock Transfer routes (#573).
 *
 * `OperatingUnitScope::constrainStockTransfers` scopes the *list* path. Without
 * this, `show` / `update` / `delete` / `post` / `reverse` would still resolve
 * any Transfer by its public ULID, so a scoped caller who learns an ID could
 * read or mutate it.
 *
 * `assertReadable` requires access to *one* endpoint's Operating Unit (mirroring
 * the read scope); `assertMutable` requires access to *both* — a mutation moves
 * stock between two units and a partial-access caller must not drive it. Bypass
 * roles (`super-admin` / `admin`) pass. Both endpoint relations are
 * `withTrashed()`, so a soft-deleted Location still resolves to its owning unit
 * rather than 403-ing its own unit's members.
 *
 * This runs *before* the Service transaction on the route-bound model, so it is
 * a fast fail. Every mutating Service method re-asserts the same both-ends check
 * under its row lock, against the Transfer's current endpoints.
 */
trait AssertsStockTransferOperatingUnitAccess
{
    protected function assertTransferReadable(OperatingUnitScope $scope, StockTransfer $transfer): void
    {
        $scope->assertCanAccessStockTransfer(request()->user(), $transfer);
    }

    protected function assertTransferMutable(OperatingUnitScope $scope, StockTransfer $transfer): void
    {
        $scope->assertCanMutateStockTransfer(request()->user(), $transfer);
    }
}
