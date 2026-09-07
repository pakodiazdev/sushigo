<?php

namespace App\Services\Inventory;

use App\DataTransferObjects\Inventory\SaveStockTransferData;
use App\DataTransferObjects\Inventory\StockTransferLineData;
use App\Exceptions\InvalidStockBalanceException;
use App\Exceptions\StockMovementNotReversibleException;
use App\Exceptions\StockMovementReversalBoundaryException;
use App\Exceptions\StockTransferAlreadyPostedException;
use App\Exceptions\StockTransferAlreadyReversedException;
use App\Exceptions\StockTransferInsufficientStockException;
use App\Exceptions\StockTransferLocationUnavailableException;
use App\Exceptions\StockTransferNotPostedException;
use App\Exceptions\StockTransferReversalBoundaryException;
use App\Exceptions\StockTransferValueOutOfRangeException;
use App\Exceptions\StockTransferVariantNotAssignedException;
use App\Exceptions\StockTransferVariantUnavailableException;
use App\Models\InventoryLocation;
use App\Models\ItemVariant;
use App\Models\StockMovement;
use App\Models\StockMovementLine;
use App\Models\StockTransfer;
use App\Models\StockTransferLine;
use App\Models\UnitOfMeasure;
use App\Models\User;
use App\Models\VariantLocationAssignment;
use App\Services\Inventory\Concerns\ConvertsUomQuantities;
use App\Support\Access\OperatingUnitScope;
use Illuminate\Support\Facades\DB;

/**
 * Creates/edits draft internal Stock Transfers and posts/reverses them
 * atomically (#573).
 *
 * Posting decrements the source Location's Stock, increments/creates the
 * destination's, blends the destination weighted-average cost with the source
 * cost snapshot (the documented transfer-cost policy — the source WAC itself is
 * never changed, since removing homogeneous units does not change the cost of
 * those that remain), and appends one immutable `TRANSFER` `StockMovement` +
 * line per Transfer line, carrying explicit source-line identity
 * (`related_type`/`related_id`/`related_line_id`, #567) so a replay returns the
 * existing movement instead of moving stock twice.
 *
 * Reversal delegates each line to the shared `StockMovementReverser` (#438):
 * a `TRANSFER` movement already carries both endpoints, so its compensating
 * movement restores the source and unwinds the destination with no
 * transfer-specific reversal code.
 *
 * Concurrency: the Transfer header row is locked for the whole post/reverse
 * transaction, so a duplicate or concurrent request serializes behind it and
 * then finds the status already advanced. Within a post, every affected Stock
 * row is locked in a deterministic `(inventory_location_id, item_variant_id)`
 * order to avoid deadlocks between two transfers touching the same Locations.
 */
class StockTransferService
{
    use ConvertsUomQuantities;

    /** Largest magnitude a `decimal(15,4)` column can hold — used to keep a derived line total off the PostgreSQL overflow (500) path. */
    private const MAX_DECIMAL_15_4 = 99999999999.9999;

    public function __construct(
        private readonly StockMutationService $stockMutation,
        private readonly StockMovementReverser $movementReverser,
        private readonly OperatingUnitScope $scope,
    ) {}

    public function createDraft(SaveStockTransferData $data): StockTransfer
    {
        return DB::transaction(function () use ($data) {
            $this->assertActorMayUseEndpoints($data->sourceLocationId, $data->destinationLocationId, $data->actingUserId);

            $transfer = StockTransfer::create([
                'source_location_id' => $data->sourceLocationId,
                'destination_location_id' => $data->destinationLocationId,
                'reference' => $data->reference,
                'transfer_date' => $data->transferDate,
                'status' => StockTransfer::STATUS_DRAFT,
                'notes' => $data->notes,
                'created_by_user_id' => $data->actingUserId,
                'meta' => [],
            ]);

            foreach ($data->lines as $lineData) {
                $this->createLine($transfer, $lineData);
            }

            return $this->freshTransfer($transfer);
        });
    }

    /**
     * @throws StockTransferAlreadyPostedException if the Transfer is not a draft
     */
    public function updateDraft(int $transferId, SaveStockTransferData $data): StockTransfer
    {
        return DB::transaction(function () use ($transferId, $data) {
            $transfer = StockTransfer::where('id', $transferId)->lockForUpdate()->firstOrFail();

            $this->assertActorMayMutateLockedTransfer($transfer, $data->actingUserId);
            $this->assertActorMayUseEndpoints($data->sourceLocationId, $data->destinationLocationId, $data->actingUserId);

            if (! $transfer->isDraft()) {
                throw new StockTransferAlreadyPostedException(
                    "Stock Transfer #{$transfer->id} is not a draft and cannot be edited."
                );
            }

            $transfer->update([
                'source_location_id' => $data->sourceLocationId,
                'destination_location_id' => $data->destinationLocationId,
                'reference' => $data->reference,
                'transfer_date' => $data->transferDate,
                'notes' => $data->notes,
            ]);

            $transfer->lines()->delete();

            foreach ($data->lines as $lineData) {
                $this->createLine($transfer, $lineData);
            }

            return $this->freshTransfer($transfer);
        });
    }

    /**
     * @throws StockTransferAlreadyPostedException if the Transfer is not a draft
     */
    public function deleteDraft(int $transferId, int $userId): void
    {
        DB::transaction(function () use ($transferId, $userId) {
            $transfer = StockTransfer::where('id', $transferId)->lockForUpdate()->firstOrFail();

            $this->assertActorMayMutateLockedTransfer($transfer, $userId);

            if (! $transfer->isDraft()) {
                throw new StockTransferAlreadyPostedException(
                    "Stock Transfer #{$transfer->id} is not a draft and cannot be deleted."
                );
            }

            $transfer->lines()->delete();
            $transfer->delete();
        });
    }

    /**
     * Post a draft Transfer: move every line's base quantity from source to
     * destination Stock, blend the destination weighted-average cost, and write
     * one immutable `TRANSFER` movement + line per line.
     *
     * @throws StockTransferAlreadyPostedException|StockTransferAlreadyReversedException|StockTransferLocationUnavailableException|StockTransferVariantUnavailableException|StockTransferVariantNotAssignedException|StockTransferInsufficientStockException
     */
    public function postTransfer(int $transferId, int $userId): StockTransfer
    {
        return DB::transaction(function () use ($transferId, $userId) {
            $transfer = StockTransfer::where('id', $transferId)->lockForUpdate()->firstOrFail();

            $this->assertActorMayMutateLockedTransfer($transfer, $userId);

            if ($transfer->isPosted()) {
                throw new StockTransferAlreadyPostedException("Stock Transfer #{$transfer->id} is already posted.");
            }

            if ($transfer->isReversed()) {
                throw new StockTransferAlreadyReversedException(
                    "Stock Transfer #{$transfer->id} has been reversed and cannot be posted again."
                );
            }

            [$source, $destination] = $this->lockEndpoints($transfer);

            $lines = $transfer->lines()
                ->orderBy('item_variant_id')
                ->get();

            $this->lockAndAssertVariantsAvailable($transfer, $lines);
            $this->lockAffectedStockDeterministically($transfer, $lines);

            foreach ($lines as $line) {
                $this->postLine($transfer, $line, $source, $destination, $userId);
            }

            $transfer->update([
                'status' => StockTransfer::STATUS_POSTED,
                'posted_at' => now(),
                'posted_by_user_id' => $userId,
            ]);

            return $this->freshTransfer($transfer);
        });
    }

    /**
     * Reverse a posted Transfer: compensate every line's `TRANSFER` movement
     * through the shared reverser (restores source, unwinds destination), then
     * advance the Transfer lifecycle to REVERSED atomically.
     *
     * @throws StockTransferNotPostedException|StockTransferAlreadyReversedException|StockTransferReversalBoundaryException
     */
    public function reverseTransfer(int $transferId, int $userId, ?string $reason): StockTransfer
    {
        return DB::transaction(function () use ($transferId, $userId, $reason) {
            $transfer = StockTransfer::where('id', $transferId)->lockForUpdate()->firstOrFail();

            $this->assertActorMayMutateLockedTransfer($transfer, $userId);

            if ($transfer->isDraft()) {
                throw new StockTransferNotPostedException("Stock Transfer #{$transfer->id} was never posted; nothing to reverse.");
            }

            if ($transfer->isReversed()) {
                throw new StockTransferAlreadyReversedException("Stock Transfer #{$transfer->id} has already been reversed.");
            }

            $lines = $transfer->lines()->orderBy('item_variant_id')->get();

            // Acquire every affected Stock row lock up front in the same
            // deterministic (location, variant) order posting uses. Without this,
            // StockMovementReverser locks the original destination before the
            // source, the opposite order to postTransfer(), so a reversal racing
            // a concurrent post/reversal on the same pair could deadlock.
            $this->lockAffectedStockDeterministically($transfer, $lines);

            foreach ($lines as $line) {
                $this->reverseLine($transfer, $line, $userId, $reason);
            }

            $transfer->update([
                'status' => StockTransfer::STATUS_REVERSED,
                'reversed_at' => now(),
                'reversed_by_user_id' => $userId,
                'reversal_reason' => $reason,
            ]);

            return $this->freshTransfer($transfer);
        });
    }

    private function createLine(StockTransfer $transfer, StockTransferLineData $lineData): StockTransferLine
    {
        $variant = ItemVariant::with('unitOfMeasure')->findOrFail($lineData->itemVariantId);
        $entryUom = UnitOfMeasure::findOrFail($lineData->entryUomId);

        [$baseQuantity, $conversionFactor] = $this->convertToBaseQuantity(
            $lineData->entryQuantity,
            $lineData->entryUomId,
            $variant,
            $entryUom,
        );

        return StockTransferLine::create([
            'stock_transfer_id' => $transfer->id,
            'item_variant_id' => $variant->id,
            'entry_uom_id' => $entryUom->id,
            'entry_quantity' => $lineData->entryQuantity,
            'conversion_factor' => $conversionFactor,
            'base_quantity' => $baseQuantity,
            'source_unit_cost' => null,
            'meta' => [],
        ]);
    }

    /**
     * Lock both endpoint Location rows (in primary-key order for a stable lock
     * sequence) and assert each is a live, active stock-holding Location.
     *
     * @return array{0: InventoryLocation, 1: InventoryLocation}
     *
     * @throws StockTransferLocationUnavailableException
     */
    private function lockEndpoints(StockTransfer $transfer): array
    {
        $ids = [$transfer->source_location_id, $transfer->destination_location_id];
        sort($ids);

        $locked = InventoryLocation::whereIn('id', $ids)
            ->orderBy('id')
            ->lockForUpdate()
            ->get()
            ->keyBy('id');

        $source = $locked->get($transfer->source_location_id);
        $destination = $locked->get($transfer->destination_location_id);

        foreach (['source' => $source, 'destination' => $destination] as $role => $location) {
            if (! $location) {
                throw new StockTransferLocationUnavailableException(
                    "Stock Transfer #{$transfer->id}'s {$role} location is no longer available."
                );
            }

            if (! $location->is_active) {
                throw new StockTransferLocationUnavailableException(
                    "Stock Transfer #{$transfer->id}'s {$role} location is inactive and cannot move stock."
                );
            }
        }

        if ((int) $transfer->source_location_id === (int) $transfer->destination_location_id) {
            throw new StockTransferLocationUnavailableException(
                "Stock Transfer #{$transfer->id} has the same source and destination location."
            );
        }

        return [$source, $destination];
    }

    /**
     * Lock referenced Variant rows in primary-key order and reject a draft
     * whose catalog state changed before posting. The lock also serializes a
     * concurrent deactivate/delete behind the posting decision.
     *
     * @param  \Illuminate\Support\Collection<int, StockTransferLine>  $lines
     *
     * @throws StockTransferVariantUnavailableException
     */
    private function lockAndAssertVariantsAvailable(StockTransfer $transfer, $lines): void
    {
        $variantIds = $lines->pluck('item_variant_id')->map(fn ($id) => (int) $id)->unique()->sort()->values();

        $variants = ItemVariant::query()
            ->whereIn('id', $variantIds)
            ->orderBy('id')
            ->lockForUpdate()
            ->get()
            ->keyBy('id');

        foreach ($variantIds as $variantId) {
            if (! $variants->get($variantId)?->is_active) {
                throw new StockTransferVariantUnavailableException(
                    "Stock Transfer #{$transfer->id} references a Product Variant that is no longer available."
                );
            }
        }
    }

    /**
     * Acquire every affected Stock row lock up front, in a deterministic
     * `(inventory_location_id, item_variant_id)` order, so two transfers moving
     * overlapping Variants between the same Locations can never deadlock by
     * grabbing the two rows in opposite orders.
     *
     * @param  \Illuminate\Support\Collection<int, StockTransferLine>  $lines
     */
    private function lockAffectedStockDeterministically(StockTransfer $transfer, $lines): void
    {
        $pairs = [];

        foreach ($lines as $line) {
            foreach ([$transfer->source_location_id, $transfer->destination_location_id] as $locationId) {
                $pairs[$locationId.':'.$line->item_variant_id] = [
                    'location' => (int) $locationId,
                    'variant' => (int) $line->item_variant_id,
                ];
            }
        }

        $pairs = array_values($pairs);
        usort($pairs, fn ($a, $b) => [$a['location'], $a['variant']] <=> [$b['location'], $b['variant']]);

        foreach ($pairs as $pair) {
            // Acquire the lock (or confirm the row does not exist yet). The
            // return value is intentionally unused — `postLine` re-reads each
            // row through StockMutationService under the same transaction.
            $this->stockMutation->lockAndGet($pair['location'], $pair['variant']);
        }
    }

    /**
     * @throws StockTransferVariantNotAssignedException|StockTransferInsufficientStockException
     */
    private function postLine(
        StockTransfer $transfer,
        StockTransferLine $line,
        InventoryLocation $source,
        InventoryLocation $destination,
        int $userId,
    ): void {
        // Idempotency backstop: a prior identical post already moved this line.
        if ($this->existingPostedMovement($transfer, $line)) {
            return;
        }

        $variantId = (int) $line->item_variant_id;
        $baseQty = (float) $line->base_quantity;

        // Lock the live assignment row for the rest of this transaction, not just
        // read it: two concurrent posts of the same (destination, variant) are
        // then serialized, and an unassignment's soft-delete blocks behind an
        // in-flight post instead of racing the `exists()` check. (The narrow
        // residual window — the very first inbound Stock for a pair racing an
        // unassignment whose own guard only locks the not-yet-existing Stock row
        // — is the assignment contract's documented, cross-workflow concern per
        // #569/#572, shared with the Receipt and Opening Balance inbound paths.)
        $assignment = VariantLocationAssignment::query()
            ->where('inventory_location_id', $destination->id)
            ->where('item_variant_id', $variantId)
            ->lockForUpdate()
            ->first();

        if (! $assignment) {
            throw new StockTransferVariantNotAssignedException(
                "Stock Transfer #{$transfer->id}: variant #{$variantId} is not assigned to the destination location. "
                .'Assign it to the destination before transferring — an internal move never expands the assortment.'
            );
        }

        $sourceStock = $this->stockMutation->lockAndGet($source->id, $variantId);

        if (! $sourceStock) {
            throw new StockTransferInsufficientStockException(
                "Stock Transfer #{$transfer->id}: the source location holds no stock of variant #{$variantId}."
            );
        }

        $sourceCost = (float) $sourceStock->weighted_avg_cost;
        $lineTotal = $sourceCost * $baseQty;

        // A large-but-in-range quantity times a modest unit cost can still
        // overflow `stock_movement_lines.line_total` (decimal(15,4)). Catch it
        // as a 409 here, before any balance is touched, instead of a raw
        // PostgreSQL numeric-overflow 500 at INSERT time.
        if (round(abs($lineTotal), 4) > self::MAX_DECIMAL_15_4) {
            throw new StockTransferValueOutOfRangeException(
                "Stock Transfer #{$transfer->id}: the value of line #{$line->id} "
                ."({$baseQty} × {$sourceCost}) exceeds the amount that can be recorded."
            );
        }

        // Adding this line to the destination's existing balance must also stay
        // inside decimal(15,4) — two individually valid balances can sum out of
        // range. Checked before any write so it is a 409, not an overflow 500 on
        // the `stock.on_hand` increment.
        $this->assertResultingBalanceRecordable(
            $transfer,
            'destination',
            (float) ($this->stockMutation->lockAndGet($destination->id, $variantId)?->on_hand ?? 0.0),
            $baseQty,
        );

        try {
            $this->stockMutation->decreaseOnHand($sourceStock, $baseQty);
        } catch (InvalidStockBalanceException $e) {
            throw new StockTransferInsufficientStockException(
                "Stock Transfer #{$transfer->id}: the source location does not have enough unreserved stock of "
                ."variant #{$variantId} to move {$baseQty}. {$e->getMessage()}"
            );
        }

        // Removing homogeneous units does not change the source WAC, so it is
        // deliberately left untouched. The destination blends the snapshot as
        // an inbound cost.
        $destinationStock = $this->stockMutation->receiveInto($destination->id, $variantId, $baseQty);
        $destinationStock->applyWeightedAverageCost($baseQty, $sourceCost);

        $line->forceFill(['source_unit_cost' => $sourceCost])->save();

        $movement = StockMovement::create([
            'from_location_id' => $source->id,
            'to_location_id' => $destination->id,
            'item_variant_id' => $variantId,
            'user_id' => $userId,
            'qty' => $baseQty,
            'reason' => StockMovement::REASON_TRANSFER,
            'status' => StockMovement::STATUS_POSTED,
            'reference' => $transfer->reference,
            'related_id' => $transfer->id,
            'related_type' => StockTransfer::class,
            'related_line_id' => $line->id,
            'notes' => null,
            'meta' => [
                'entry_uom_id' => (int) $line->entry_uom_id,
                'entry_quantity' => (float) $line->entry_quantity,
                'conversion_factor' => (float) $line->conversion_factor,
                'source_unit_cost' => $sourceCost,
            ],
            'posted_at' => now(),
        ]);

        StockMovementLine::create([
            'stock_movement_id' => $movement->id,
            'item_variant_id' => $variantId,
            'uom_id' => (int) $line->entry_uom_id,
            'qty' => (float) $line->entry_quantity,
            'base_qty' => $baseQty,
            'conversion_factor' => (float) $line->conversion_factor,
            'unit_cost' => $sourceCost,
            'line_total' => $lineTotal,
            'meta' => [],
        ]);
    }

    /**
     * @throws StockTransferReversalBoundaryException|StockTransferAlreadyReversedException
     */
    private function reverseLine(StockTransfer $transfer, StockTransferLine $line, int $userId, ?string $reason): void
    {
        $movement = StockMovement::query()
            ->where('related_type', StockTransfer::class)
            ->where('related_id', $transfer->id)
            ->where('related_line_id', $line->id)
            ->where('reason', StockMovement::REASON_TRANSFER)
            ->where('status', StockMovement::STATUS_POSTED)
            ->first();

        if (! $movement) {
            throw new StockTransferReversalBoundaryException(
                "Cannot reverse Stock Transfer #{$transfer->id}: its posted movement for line #{$line->id} is missing "
                .'or was already reversed.'
            );
        }

        // The reverser restores `qty` to the source via receiveInto(); if the
        // source was replenished since the transfer, that addition can push
        // `stock.on_hand` past decimal(15,4). Check the projected balance here so
        // it is a 409, not an overflow 500 inside StockMovementReverser.
        $sourceStock = $this->stockMutation->lockAndGet(
            (int) $movement->from_location_id,
            (int) $movement->item_variant_id,
        );
        $this->assertResultingBalanceRecordable(
            $transfer,
            'source',
            (float) ($sourceStock?->on_hand ?? 0.0),
            (float) $movement->qty,
        );

        try {
            $this->movementReverser->reverse($movement, $userId, $reason);
        } catch (StockMovementNotReversibleException $e) {
            throw new StockTransferAlreadyReversedException(
                "Cannot reverse Stock Transfer #{$transfer->id}: line #{$line->id} has already been reversed. {$e->getMessage()}"
            );
        } catch (StockMovementReversalBoundaryException $e) {
            throw new StockTransferReversalBoundaryException(
                "Cannot reverse Stock Transfer #{$transfer->id}: the destination stock for line #{$line->id} has fallen "
                ."below the transferred quantity. {$e->getMessage()}"
            );
        }
    }

    /**
     * Assert `$currentOnHand + $added` still fits `stock.on_hand`'s
     * decimal(15,4) column, so a legitimate-but-huge resulting balance is a
     * controlled 409 rather than a PostgreSQL numeric-overflow 500.
     *
     * @throws StockTransferValueOutOfRangeException
     */
    private function assertResultingBalanceRecordable(StockTransfer $transfer, string $end, float $currentOnHand, float $added): void
    {
        if (round($currentOnHand + $added, 4) > self::MAX_DECIMAL_15_4) {
            throw new StockTransferValueOutOfRangeException(
                "Stock Transfer #{$transfer->id}: the resulting {$end} balance "
                .'exceeds the amount that can be recorded.'
            );
        }
    }

    private function existingPostedMovement(StockTransfer $transfer, StockTransferLine $line): ?StockMovement
    {
        return StockMovement::query()
            ->where('related_type', StockTransfer::class)
            ->where('related_id', $transfer->id)
            ->where('related_line_id', $line->id)
            ->where('reason', StockMovement::REASON_TRANSFER)
            ->where('status', StockMovement::STATUS_POSTED)
            ->first();
    }

    private function assertActorMayUseEndpoints(int $sourceLocationId, int $destinationLocationId, int $userId): void
    {
        $user = User::findOrFail($userId);

        $this->scope->assertCanAccessLocation($user, $sourceLocationId);
        $this->scope->assertCanAccessLocation($user, $destinationLocationId);
    }

    private function assertActorMayMutateLockedTransfer(StockTransfer $transfer, int $userId): void
    {
        $user = User::findOrFail($userId);

        $this->scope->assertCanAccessLocation($user, $transfer->sourceLocation);
        $this->scope->assertCanAccessLocation($user, $transfer->destinationLocation);
    }

    private function freshTransfer(StockTransfer $transfer): StockTransfer
    {
        return $transfer->fresh([
            'lines.itemVariant.item',
            'lines.entryUom',
            'sourceLocation',
            'destinationLocation',
            'createdByUser',
            'postedByUser',
            'reversedByUser',
        ]);
    }
}
