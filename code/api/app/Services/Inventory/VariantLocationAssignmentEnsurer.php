<?php

declare(strict_types=1);

namespace App\Services\Inventory;

use App\Models\VariantLocationAssignment;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;

/**
 * Idempotently lands a live `VariantLocationAssignment` for a
 * `(inventory_location_id, item_variant_id)` pair (#569), recovering from the
 * partial-unique-index race two concurrent writers for the same unassigned pair
 * would otherwise lose.
 *
 * It never writes a `Stock` row or a `StockMovement` — an assignment states
 * "this Variant is managed here", nothing about a balance. A pair that already
 * has a live assignment is a no-op; a soft-deleted one is reactivated.
 *
 * Extracted from `AssignVariantToLocationController` so the Purchase Receipt
 * posting path (#572) can ensure the same assortment assignment inside its own
 * post transaction without duplicating the race-recovery shape.
 */
class VariantLocationAssignmentEnsurer
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

        if ($existing === null) {
            return $this->insertOrRecoverFromRace($inventoryLocationId, $itemVariantId);
        }

        $reactivated = $existing->trashed();

        if ($reactivated) {
            $existing->restore();
        }

        return [$existing, $reactivated];
    }

    /**
     * First live insert for the pair, recovering from the partial-unique-index
     * race a concurrent writer would otherwise surface as a raw DB error. Same
     * savepoint/recover shape as `StockMutationService::insertOrRecoverFromRace()`.
     *
     * @return array{0: VariantLocationAssignment, 1: bool}
     */
    private function insertOrRecoverFromRace(int $inventoryLocationId, int $itemVariantId): array
    {
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
