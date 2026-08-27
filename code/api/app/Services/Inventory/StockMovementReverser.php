<?php

namespace App\Services\Inventory;

use App\Exceptions\InvalidStockBalanceException;
use App\Exceptions\StockMovementNotReversibleException;
use App\Exceptions\StockMovementReversalBoundaryException;
use App\Models\StockMovement;
use Illuminate\Support\Facades\DB;

/**
 * Reverses a posted StockMovement by posting an immutable, causally-linked
 * compensating movement — the append-only correction workflow every
 * inventory flow shares (#438).
 *
 * Guarantees:
 *  - the affected balance is restored exactly once — a posted movement can be
 *    compensated at most once (unique reverses_stock_movement_id + a locked
 *    status re-check), and the compensating movement mirrors the original's
 *    direction and quantity precisely;
 *  - the original is never edited or deleted — only its POSTED -> REVERSED
 *    transition plus reversal audit columns (who, when, why) are written;
 *  - the whole operation is atomic: if unwinding the balance would drive a
 *    location negative, nothing is persisted.
 */
class StockMovementReverser
{
    public function __construct(
        private readonly StockMutationService $stockMutation,
    ) {}

    /**
     * @throws StockMovementNotReversibleException if the movement is not a POSTED, not-yet-reversed original
     * @throws StockMovementReversalBoundaryException if the balance the movement added has since been consumed
     */
    public function reverse(StockMovement $movement, ?int $userId = null, ?string $reason = null): StockMovement
    {
        return DB::transaction(function () use ($movement, $userId, $reason) {
            /** @var StockMovement $original */
            $original = StockMovement::whereKey($movement->getKey())->lockForUpdate()->firstOrFail();

            if ($original->isReversal()) {
                throw new StockMovementNotReversibleException(
                    "StockMovement #{$original->id} is itself a compensating reversal and cannot be reversed."
                );
            }

            if (! $original->isPosted()) {
                throw new StockMovementNotReversibleException(
                    "StockMovement #{$original->id} is {$original->status}; only a POSTED movement can be reversed."
                );
            }

            if ($original->reversal()->exists()) {
                throw new StockMovementNotReversibleException(
                    "StockMovement #{$original->id} has already been reversed."
                );
            }

            $this->applyInverseBalance($original);

            $compensating = new StockMovement([
                'from_location_id' => $original->to_location_id,
                'to_location_id' => $original->from_location_id,
                'item_variant_id' => $original->item_variant_id,
                'user_id' => $userId,
                'qty' => $original->qty,
                'reason' => $original->reason,
                'status' => StockMovement::STATUS_POSTED,
                'reference' => $original->reference,
                'related_id' => $original->related_id,
                'related_type' => $original->related_type,
                'reversal_reason' => $reason,
                'notes' => $reason,
                'meta' => ['reversal_of_movement_id' => $original->id],
                'posted_at' => now(),
            ]);
            $compensating->reverses_stock_movement_id = $original->id;
            $compensating->save();

            $original->forceFill([
                'status' => StockMovement::STATUS_REVERSED,
                'reversed_at' => now(),
                'reversed_by_user_id' => $userId,
                'reversal_reason' => $reason,
            ])->save();

            return $compensating->fresh(['reverses', 'itemVariant', 'fromLocation', 'toLocation']);
        });
    }

    /**
     * Undo the original movement's effect on stock: remove what it added into
     * its destination, and return what it took from its source.
     *
     * @throws StockMovementReversalBoundaryException
     */
    private function applyInverseBalance(StockMovement $original): void
    {
        $qty = (float) $original->qty;
        $variantId = $original->item_variant_id;

        if ($original->to_location_id !== null) {
            $stock = $this->stockMutation->lockAndGet($original->to_location_id, $variantId);

            if (! $stock) {
                throw new StockMovementReversalBoundaryException(
                    "Cannot reverse StockMovement #{$original->id}: no stock remains at location "
                    ."#{$original->to_location_id} for variant #{$variantId}."
                );
            }

            try {
                $this->stockMutation->decreaseOnHand($stock, $qty);
            } catch (InvalidStockBalanceException $e) {
                throw new StockMovementReversalBoundaryException(
                    "Cannot reverse StockMovement #{$original->id}: stock at location #{$original->to_location_id} "
                    ."has fallen below the {$qty} units it added. {$e->getMessage()}"
                );
            }
        }

        if ($original->from_location_id !== null) {
            $this->stockMutation->receiveInto($original->from_location_id, $variantId, $qty);
        }
    }
}
