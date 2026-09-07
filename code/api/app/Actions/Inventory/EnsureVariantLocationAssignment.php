<?php

namespace App\Actions\Inventory;

use App\Models\VariantLocationAssignment;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;

/**
 * Idempotently lands a live `VariantLocationAssignment` for a
 * `(inventory_location_id, item_variant_id)` pair (#569), restoring a
 * soft-deleted row rather than inserting a duplicate.
 *
 * Extracted from `AssignVariantToLocationController` so the Opening Balance
 * posting path (#570) can guarantee the assignment inside the same transaction
 * as the Stock entry without duplicating the assign-or-recover logic. Unlike the
 * PUT endpoint, callers here do **not** reject an inactive Variant: recording
 * initial on-hand that physically exists is legitimate even for a Variant that
 * was deactivated after the stock was acquired — that guard stays in the
 * controller, before it calls this action.
 *
 * Call it from inside the caller's `DB::transaction()` — the create runs in its
 * own nested transaction (a Postgres SAVEPOINT) so a lost uniqueness race
 * recovers the winner without aborting the caller's transaction.
 */
class EnsureVariantLocationAssignment
{
    /**
     * @return array{0: VariantLocationAssignment, 1: bool} the live assignment and
     *                                                      whether this call created or reactivated it
     */
    public function ensure(int $inventoryLocationId, int $itemVariantId): array
    {
        $existing = VariantLocationAssignment::withTrashed()
            ->where('inventory_location_id', $inventoryLocationId)
            ->where('item_variant_id', $itemVariantId)
            ->first();

        if ($existing !== null) {
            $reactivated = $existing->trashed();

            if ($reactivated) {
                $existing->restore();
            }

            return [$existing, $reactivated];
        }

        try {
            $assignment = DB::transaction(fn () => VariantLocationAssignment::create([
                'inventory_location_id' => $inventoryLocationId,
                'item_variant_id' => $itemVariantId,
            ]));

            return [$assignment, true];
        } catch (UniqueConstraintViolationException) {
            $winner = VariantLocationAssignment::query()
                ->where('inventory_location_id', $inventoryLocationId)
                ->where('item_variant_id', $itemVariantId)
                ->firstOrFail();

            return [$winner, false];
        }
    }
}
