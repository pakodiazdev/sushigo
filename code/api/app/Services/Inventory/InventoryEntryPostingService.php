<?php

namespace App\Services\Inventory;

use App\DataTransferObjects\Inventory\InventoryEntryPostingData;
use App\Exceptions\InventoryEntryRecoveryException;
use App\Models\StockMovement;
use App\Models\StockMovementLine;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;

/**
 * The one posting primitive every inbound inventory writer (Purchase Receipts,
 * Opening Balances, and future imports / supplier returns / corrections) shares
 * (#567). It performs — as one transactionally consistent unit owned by the
 * caller's transaction — the four things each writer used to orchestrate in its
 * own order:
 *
 *  1. append the immutable StockMovement evidence (append-only, #438);
 *  2. lock or race-safely create the destination Stock row (#430, via
 *     StockMutationService::receiveInto());
 *  3. blend the weighted-average acquisition cost when a cost is supplied
 *     (#434, via Stock::applyWeightedAverageCost());
 *  4. append the movement's optional single line.
 *
 * The evidence row is written *first*, before Stock is touched, so the partial
 * UNIQUE index on (related_type, related_id, related_line_id, reason) is a real
 * idempotency backstop: a concurrent or retried duplicate of the same source
 * line loses the INSERT race and recovers the winner's movement without
 * incrementing Stock a second time.
 *
 * Like StockMutationService, post() must be called from inside the caller's
 * DB::transaction() — the owning business document controls the outer
 * transaction and lifecycle; this service never opens its own.
 */
class InventoryEntryPostingService
{
    public function __construct(
        private readonly StockMutationService $stockMutation,
    ) {}

    public function post(InventoryEntryPostingData $data): StockMovement
    {
        // Fast idempotency path: a prior identical source-line posting already
        // applied its effect — return it untouched rather than doing the work
        // again and leaning on the DB constraint to reject it.
        if ($data->sourceLineId !== null && ($existing = $this->existingPostedMovement($data))) {
            return $existing->load('lines');
        }

        $movement = $this->createMovementOrRecoverDuplicate($data);

        // A recovered duplicate — a concurrent caller committed the same source
        // line between our pre-check and the INSERT above — has already applied
        // (or is applying, under its own lock) the Stock and cost effect. Return
        // it without incrementing Stock a second time.
        if (! $movement->wasRecentlyCreated) {
            return $movement->load('lines');
        }

        $stock = $this->stockMutation->receiveInto(
            $data->inventoryLocationId,
            $data->itemVariantId,
            $data->baseQuantity,
        );

        // A null cost means "no blend"; an explicit 0.0 is a real cost that
        // still moves the weighted average (e.g. free/bonus stock).
        if ($data->unitCost !== null) {
            $stock->applyWeightedAverageCost($data->baseQuantity, $data->unitCost);
        }

        if ($data->line !== null) {
            StockMovementLine::create([
                'stock_movement_id' => $movement->id,
                'item_variant_id' => $data->itemVariantId,
                'uom_id' => $data->line->uomId,
                'qty' => $data->line->qty,
                'base_qty' => $data->line->baseQty,
                'conversion_factor' => $data->line->conversionFactor,
                'unit_cost' => $data->line->unitCost,
                'line_total' => $data->line->lineTotal,
                'meta' => $data->line->meta,
            ]);
        }

        return $movement->fresh(['lines']);
    }

    /**
     * Insert the immutable evidence row, or — when a concurrent caller committed
     * the same source line between the caller's pre-check and this INSERT —
     * recover and return their row (`wasRecentlyCreated` is false on a recovered
     * row, true on a freshly inserted one).
     *
     * The INSERT runs inside its own nested transaction, which Postgres executes
     * as a SAVEPOINT when already inside the caller's transaction. This matters:
     * Postgres aborts the *entire* enclosing transaction after any failed
     * statement, so without the savepoint the losing racer's
     * UniqueConstraintViolationException would leave the outer transaction
     * unusable and the recovery query below would fail too. The savepoint rolls
     * back just the failed INSERT, keeping the caller's transaction alive. Same
     * pattern as StockMutationService::insertOrRecoverFromRace().
     *
     * @throws InventoryEntryRecoveryException if the DB rejected the INSERT as a duplicate but no matching row can be recovered
     */
    public function createMovementOrRecoverDuplicate(InventoryEntryPostingData $data): StockMovement
    {
        try {
            return DB::transaction(fn () => StockMovement::create([
                'from_location_id' => null,
                'to_location_id' => $data->inventoryLocationId,
                'item_variant_id' => $data->itemVariantId,
                'user_id' => $data->userId,
                'qty' => $data->baseQuantity,
                'reason' => $data->reason,
                'status' => StockMovement::STATUS_POSTED,
                'reference' => $data->reference,
                'related_type' => $data->sourceType,
                'related_id' => $data->sourceId,
                'related_line_id' => $data->sourceLineId,
                'notes' => $data->notes,
                'meta' => $data->movementMeta,
                'posted_at' => $data->postedAt ?? now(),
            ]));
        } catch (UniqueConstraintViolationException $e) {
            return $this->existingPostedMovement($data) ?? throw new InventoryEntryRecoveryException(
                'Duplicate source-line movement rejected by the database but could not be recovered.',
                0,
                $e,
            );
        }
    }

    /**
     * The live POSTED movement already recorded for this exact source line and
     * reason, if any. Only meaningful when the command carries a source line —
     * and the DTO guarantees that a set sourceLineId comes with a set
     * sourceType/sourceId, so the equality match below never degrades to a
     * `= NULL` that matches nothing.
     */
    private function existingPostedMovement(InventoryEntryPostingData $data): ?StockMovement
    {
        if ($data->sourceLineId === null) {
            return null;
        }

        return StockMovement::query()
            ->where('related_type', $data->sourceType)
            ->where('related_id', $data->sourceId)
            ->where('related_line_id', $data->sourceLineId)
            ->where('reason', $data->reason)
            ->where('status', StockMovement::STATUS_POSTED)
            ->first();
    }
}
