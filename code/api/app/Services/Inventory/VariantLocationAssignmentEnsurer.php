<?php

declare(strict_types=1);

namespace App\Services\Inventory;

use App\Models\VariantLocationAssignment;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;

/**
 * Idempotently lands a live `VariantLocationAssignment` for a
 * `(inventory_location_id, item_variant_id)` pair (#569).
 *
 * The partial unique index `vla_one_assignment_per_pair` only covers *live* rows
 * (`deleted_at is null`), so a pair can legitimately have **one live row plus any
 * number of soft-deleted (archived) rows** — every unassign/reassign cycle
 * leaves another archived row behind. `ensure()` must therefore:
 *
 *  - return an already-live row untouched (a no-op) — never restore an archived
 *    row while a live one exists, which would violate the partial index and, on
 *    the Receipt posting path, abort the whole confirmation;
 *  - otherwise restore the most recent archived row, or insert a fresh one;
 *  - recover from the race where a concurrent writer lands the live row between
 *    our read and our write (`UniqueConstraintViolationException` → refetch the
 *    winner) instead of surfacing a raw DB error.
 *
 * It never writes a `Stock` row or a `StockMovement`. Extracted from
 * `AssignVariantToLocationController` so the Purchase Receipt posting path (#572)
 * can ensure the same assortment assignment inside its own post transaction.
 */
class VariantLocationAssignmentEnsurer
{
    /**
     * @return array{0: VariantLocationAssignment, 1: bool} the live assignment and
     *                                                      whether this call created or reactivated it
     */
    public function ensure(int $inventoryLocationId, int $itemVariantId): array
    {
        // A live row is the common case — take it under lock so a concurrent
        // ensure/unassign for the same pair serialises against this one rather
        // than racing it. `VariantLocationAssignment` (no global soft-delete
        // scope override) means this query already excludes archived rows.
        $live = VariantLocationAssignment::query()
            ->where('inventory_location_id', $inventoryLocationId)
            ->where('item_variant_id', $itemVariantId)
            ->lockForUpdate()
            ->first();

        if ($live !== null) {
            return [$live, false];
        }

        try {
            return DB::transaction(function () use ($inventoryLocationId, $itemVariantId) {
                // Restore the most recent archived row for the pair, if any —
                // `orderByDesc('id')` so a pair with several archived rows
                // reactivates exactly one, deterministically.
                $archived = VariantLocationAssignment::onlyTrashed()
                    ->where('inventory_location_id', $inventoryLocationId)
                    ->where('item_variant_id', $itemVariantId)
                    ->orderByDesc('id')
                    ->first();

                if ($archived !== null) {
                    $archived->restore();

                    return [$archived, true];
                }

                return [
                    VariantLocationAssignment::create([
                        'inventory_location_id' => $inventoryLocationId,
                        'item_variant_id' => $itemVariantId,
                    ]),
                    true,
                ];
            });
        } catch (UniqueConstraintViolationException) {
            // A concurrent writer won the live row (fresh insert, or restored an
            // archived one) between our lock-miss above and this write.
            $winner = VariantLocationAssignment::query()
                ->where('inventory_location_id', $inventoryLocationId)
                ->where('item_variant_id', $itemVariantId)
                ->firstOrFail();

            return [$winner, false];
        }
    }
}
