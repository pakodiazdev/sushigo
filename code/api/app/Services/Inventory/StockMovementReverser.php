<?php

namespace App\Services\Inventory;

use App\Exceptions\InvalidStockBalanceException;
use App\Exceptions\StockMovementNotReversibleException;
use App\Exceptions\StockMovementReversalBoundaryException;
use App\Models\StockMovement;
use App\Models\StockMovementLine;
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
     * @throws StockMovementNotReversibleException if the movement is not a POSTED, not-yet-reversed original,
     *                                             or is a PURCHASE_RECEIPT movement (#579)
     * @throws StockMovementReversalBoundaryException if the balance the movement added has since been consumed
     */
    public function reverse(StockMovement $movement, ?int $userId = null, ?string $reason = null): StockMovement
    {
        return DB::transaction(function () use ($movement, $userId, $reason) {
            /** @var StockMovement $original */
            $original = StockMovement::whereKey($movement->getKey())->lockForUpdate()->with('lines')->firstOrFail();

            // #579: a PURCHASE_RECEIPT movement carries weighted-average-cost
            // evidence that only ReceiptService::reverseReceipt() knows how to
            // reconcile (Stock::reverseWeightedAverageCost(), reading the
            // line's own evidenced unit cost). This generic reverser only
            // ever restores/removes quantity at the *current* average — the
            // correct, and only available, approximation for a TRANSFER (its
            // only production caller, via StockTransferService), but silently
            // wrong for a Receipt: it would flip the movement to REVERSED
            // without reconciling weighted_avg_cost/total_value, and then
            // permanently block the real reversal path (which requires the
            // movement to still be POSTED).
            if ($original->reason === StockMovement::REASON_PURCHASE_RECEIPT) {
                throw new StockMovementNotReversibleException(
                    "StockMovement #{$original->id} is a PURCHASE_RECEIPT movement; reverse it via "
                    .'ReceiptService::reverseReceipt() (which reconciles valuation), not this generic reverser.'
                );
            }

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

            // #579: mirror the original's own line evidence onto the
            // compensating movement — same qty/cost/value, opposite
            // direction (carried by from_location_id/to_location_id above,
            // not by this line, which always records a positive magnitude
            // like every other movement line). Without this, a movement
            // reversed through this generic path leaves no evidence a later
            // value reconciliation (e.g. a migration backfill) can use to
            // know the original's effect was undone.
            if (($originalLine = $original->lines->first()) !== null) {
                StockMovementLine::create([
                    'stock_movement_id' => $compensating->id,
                    'uom_id' => $originalLine->uom_id,
                    'qty' => $originalLine->qty,
                    'conversion_factor' => $originalLine->conversion_factor,
                    'unit_cost' => $originalLine->unit_cost,
                    'line_total' => $originalLine->line_total,
                    'meta' => [],
                ]);
            }

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
     * #579: uses the original movement's own recorded line evidence
     * (`unit_cost`/`line_total`) at *both* ends instead of each end's own
     * *current* average — a Transfer blends its destination's average with
     * the source's snapshotted cost, so by the time it is reversed the
     * destination's blended average and the source's current average are
     * each generally different from the value the Transfer itself actually
     * moved. Removing/restoring at either end's current average over- or
     * under-shoots by that difference (e.g. moving 5 units from 10 @ 10 into
     * 10 @ 20 preserves a total of 300; reversing at each end's own current
     * average — 16.6667 at the destination, 10 at the source — leaves only
     * ~266.6665, silently destroying value on an immediate post/reverse
     * round trip). Unwinding the exact recorded value at both ends restores
     * both Stock rows to precisely their pre-Transfer state.
     *
     * @throws StockMovementReversalBoundaryException
     */
    private function applyInverseBalance(StockMovement $original): void
    {
        $qty = (float) $original->qty;
        $variantId = $original->item_variant_id;
        $line = $original->lines->first();
        $lineValue = $line?->line_total !== null ? (float) $line->line_total : null;

        if ($original->to_location_id !== null) {
            $stock = $this->stockMutation->lockAndGet($original->to_location_id, $variantId);

            if (! $stock) {
                throw new StockMovementReversalBoundaryException(
                    "Cannot reverse StockMovement #{$original->id}: no stock remains at location "
                    ."#{$original->to_location_id} for variant #{$variantId}."
                );
            }

            try {
                if ($lineValue !== null) {
                    $stock->reverseWeightedAverageCost($qty, (float) $line->unit_cost, $lineValue);
                } else {
                    // Defensive fallback for a movement with no line
                    // evidence (none of this codebase's current writers
                    // produce one) — the same "current average" behavior
                    // this method always used before #579.
                    $stock->decreaseOnHand($qty);
                }
            } catch (InvalidStockBalanceException $e) {
                throw new StockMovementReversalBoundaryException(
                    "Cannot reverse StockMovement #{$original->id}: stock at location #{$original->to_location_id} "
                    ."has fallen below the {$qty} units it added, or the value can no longer be exactly "
                    ."reconciled. {$e->getMessage()}"
                );
            }
        }

        if ($original->from_location_id !== null) {
            // Restores exactly the value this quantity carried away — the
            // movement's own recorded line value when present, else the
            // (unchanged) current average as the same defensive fallback.
            $restored = $this->stockMutation->receiveInto($original->from_location_id, $variantId, $qty);
            $restored->restoreValueAtCurrentAverage($qty, $lineValue);
        }
    }
}
