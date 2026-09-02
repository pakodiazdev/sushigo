<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\Receipt\Concerns;

use App\Models\Receipt;
use App\Support\Access\OperatingUnitScope;

/**
 * Horizontal-authorization guard for the by-ID Purchase Receipt routes (#586).
 *
 * `OperatingUnitScope::constrainReceipts` scopes the *list* path; without this,
 * `show` / `update` / `delete` / `post` / `reverse` still resolve any Receipt by
 * its public ULID, so a scoped caller who learns an ID from another Operating
 * Unit could read or mutate it. This asserts the caller may act within the unit
 * that owns the Receipt's receiving destination location — the same relation the
 * list scope uses — and 403s otherwise. Bypass roles (`super-admin` / `admin`)
 * pass, per the #440 contract. `destinationLocation` is a `withTrashed()`
 * relation, so a Receipt whose location was later soft-deleted still resolves to
 * its owning unit rather than 403-ing its own unit's members.
 *
 * This runs *before* the service transaction and reads the route-bound Receipt,
 * so it is a fast fail, not the last word. Every mutating service method
 * (`updateDraft` / `deleteDraft` / `postReceipt` / `reverseReceipt`) re-asserts
 * the same check under its row lock, against the Receipt's current destination,
 * via `ReceiptService::assertActorMayMutateLockedReceipt`. That closes the window
 * where the caller's access changes between this guard and the lock — a
 * membership revoked, or a bypass-role user transferring a still-draft Receipt —
 * which would otherwise let a scoped caller mutate a Receipt they can no longer
 * reach.
 */
trait AssertsReceiptOperatingUnitAccess
{
    protected function assertReceiptInScope(OperatingUnitScope $scope, Receipt $receipt): void
    {
        $scope->assertCanAccessLocation(request()->user(), $receipt->destinationLocation);
    }
}
