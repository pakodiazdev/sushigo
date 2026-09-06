<?php

namespace App\Services\Inventory;

use App\Exceptions\InvalidStockBalanceException;
use App\Models\Stock;
use App\Models\VariantLocationAssignment;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;

/**
 * Reusable, atomic Stock mutation service shared by every inventory flow
 * that reads or mutates a Stock row (stock-out today; receiving, reservation
 * and transfer flows going forward). lockAndGet(), increaseOnHand() and
 * decreaseOnHand() must be called from inside an existing DB::transaction()
 * — they don't open their own, so callers keep movement creation and balance
 * mutation atomic together. insertOrRecoverFromRace() (called by
 * receiveInto() on first receipt) is the one exception: it opens its own
 * nested transaction (a savepoint when already inside a caller's
 * transaction) so it can catch a concurrent unique-constraint violation
 * without aborting the caller's outer transaction — see its own docblock.
 */
class StockMutationService
{
    /**
     * Lock the existing Stock row for update for the remainder of the
     * caller's transaction, or return null if none exists yet. Holding the
     * lock until commit is what stops a second concurrent transaction from
     * reading a stale on_hand/reserved value and overselling.
     */
    public function lockAndGet(int $inventoryLocationId, int $itemVariantId): ?Stock
    {
        return Stock::where('inventory_location_id', $inventoryLocationId)
            ->where('item_variant_id', $itemVariantId)
            ->lockForUpdate()
            ->first();
    }

    /**
     * Atomically add quantity to a location+variant's on_hand, creating the
     * Stock row on first receipt. Checks for an existing row first — the
     * common case for a location+variant that's already been received into
     * before — so a routine repeat receipt is a single locked read+increment
     * instead of an INSERT that's doomed to conflict. Only a genuine first
     * receipt falls through to insertOrRecoverFromRace(), which is where two
     * concurrent callers racing to create the same first row are kept from
     * duplicating it.
     *
     * The positive-quantity check is done here, before branching, so a first
     * receipt is rejected the same way a repeat receipt already is via
     * increaseOnHand() — otherwise Stock::create() would accept it unchecked.
     *
     * @throws InvalidStockBalanceException if $qty is not positive
     */
    public function receiveInto(int $inventoryLocationId, int $itemVariantId, float $qty): Stock
    {
        if ($qty <= 0) {
            throw new InvalidStockBalanceException(
                "Quantity must be positive to receive stock. Requested: {$qty}"
            );
        }

        // Receiving stock into a (Location, Variant) pair means that Variant is
        // managed there — keep the managed-assortment assignment (#569) in
        // lockstep so the assignment-spined Existencias read model (#571) never
        // hides a balance a posted movement just committed. #569's one-time
        // backfill only covered pairs that had Stock at migration time; this
        // extends the same "a Stock pair implies a live assignment" invariant
        // to every subsequent first receipt (Receipts, Opening Balances,
        // reversals into a source Location).
        $this->ensureManagedAssignment($inventoryLocationId, $itemVariantId);

        $stock = $this->lockAndGet($inventoryLocationId, $itemVariantId);

        if ($stock) {
            return $this->increaseOnHand($stock, $qty);
        }

        return $this->insertOrRecoverFromRace($inventoryLocationId, $itemVariantId, $qty);
    }

    /**
     * Attempt the first-receipt INSERT for a location+variant that appeared
     * to have no Stock row a moment ago. If a concurrent caller won the race
     * and created it in between, this INSERT hits the unique Location+Variant
     * constraint — recover by locking the winner's row and incrementing it
     * instead of failing.
     */
    public function insertOrRecoverFromRace(int $inventoryLocationId, int $itemVariantId, float $qty): Stock
    {
        try {
            // Nested in its own savepoint: Postgres aborts the whole
            // enclosing transaction after a failed statement unless the
            // failing INSERT is isolated behind a savepoint — this lets the
            // caller's outer transaction keep going after we catch the
            // conflict below.
            return DB::transaction(fn () => Stock::create([
                'inventory_location_id' => $inventoryLocationId,
                'item_variant_id' => $itemVariantId,
                'on_hand' => $qty,
                'reserved' => 0,
                'meta' => [],
            ]));
        } catch (UniqueConstraintViolationException) {
            $stock = Stock::where('inventory_location_id', $inventoryLocationId)
                ->where('item_variant_id', $itemVariantId)
                ->lockForUpdate()
                ->firstOrFail();

            return $this->increaseOnHand($stock, $qty);
        }
    }

    /**
     * Increase on_hand for an already-locked Stock row.
     */
    public function increaseOnHand(Stock $stock, float $qty): Stock
    {
        $stock->increaseOnHand($qty);

        return $stock->fresh();
    }

    /**
     * Decrease on_hand for an already-locked Stock row. Rejects the
     * mutation before it reaches the database if it would drive on_hand
     * negative — the same guard fires for any caller, not just HTTP.
     *
     * @throws InvalidStockBalanceException
     */
    public function decreaseOnHand(Stock $stock, float $qty): Stock
    {
        $stock->decreaseOnHand($qty);

        return $stock->fresh();
    }

    /**
     * Idempotently land a live managed assignment (#569) for the pair being
     * received into. Reactivates a soft-deleted assignment (a receipt into a
     * pair someone unassigned once its balance hit zero re-manages it, matching
     * the #569 assign endpoint's "201 on create/reactivate"), and recovers from
     * the partial-unique-index race two concurrent first receipts would
     * otherwise lose — the same savepoint shape as insertOrRecoverFromRace()
     * above, so a lost INSERT never aborts the caller's outer transaction.
     */
    private function ensureManagedAssignment(int $inventoryLocationId, int $itemVariantId): void
    {
        $existing = VariantLocationAssignment::withTrashed()
            ->where('inventory_location_id', $inventoryLocationId)
            ->where('item_variant_id', $itemVariantId)
            ->first();

        if ($existing !== null) {
            if ($existing->trashed()) {
                $existing->restore();
            }

            return;
        }

        try {
            DB::transaction(fn () => VariantLocationAssignment::create([
                'inventory_location_id' => $inventoryLocationId,
                'item_variant_id' => $itemVariantId,
            ]));
        } catch (UniqueConstraintViolationException) {
            // A concurrent first receipt created the live assignment between
            // our read and this insert — the invariant already holds.
        }
    }
}
