<?php

namespace App\Services\Inventory;

use App\DataTransferObjects\Inventory\InventoryEntryLineData;
use App\DataTransferObjects\Inventory\InventoryEntryPostingData;
use App\DataTransferObjects\Inventory\ReceiptLineData;
use App\DataTransferObjects\Inventory\SaveReceiptData;
use App\Exceptions\InvalidStockBalanceException;
use App\Exceptions\ReceiptAlreadyPostedException;
use App\Exceptions\ReceiptAlreadyReversedException;
use App\Exceptions\ReceiptDestinationUnavailableException;
use App\Exceptions\ReceiptNotPostedException;
use App\Exceptions\ReceiptReversalBoundaryException;
use App\Exceptions\ReceiptVariantUnavailableException;
use App\Models\InventoryLocation;
use App\Models\Receipt;
use App\Models\ReceiptLine;
use App\Models\Stock;
use App\Models\StockMovement;
use App\Models\StockMovementLine;
use App\Models\VariantPurchasePresentation;
use Illuminate\Support\Facades\DB;

/**
 * Creates/edits draft Purchase Receipts and posts/reverses them atomically
 * into Stock. Posting delegates every received line to the shared
 * InventoryEntryPostingService (#567), which owns the lockForUpdate +
 * race-recovery pattern from #430, the weighted-average cost blend (#434), the
 * immutable movement/line evidence (#438), and the per-source-line idempotency
 * backstop. Receipt-header locking still guards the document lifecycle.
 */
class ReceiptService
{
    public function __construct(
        private readonly InventoryEntryPostingService $entryPosting,
    ) {}

    public function createDraft(SaveReceiptData $data): Receipt
    {
        return DB::transaction(function () use ($data) {
            $receipt = Receipt::create([
                'supplier_id' => $data->supplierId,
                'destination_location_id' => $data->destinationLocationId,
                'reference' => $data->reference,
                'receipt_date' => $data->receiptDate,
                'status' => Receipt::STATUS_DRAFT,
                'notes' => $data->notes,
                'created_by_user_id' => $data->actingUserId,
                'meta' => [],
            ]);

            foreach ($data->lines as $lineData) {
                $this->createLine($receipt, $lineData);
            }

            return $this->freshReceipt($receipt);
        });
    }

    /**
     * @throws ReceiptAlreadyPostedException if the Receipt is not a draft
     */
    public function updateDraft(int $receiptId, SaveReceiptData $data): Receipt
    {
        return DB::transaction(function () use ($receiptId, $data) {
            $receipt = Receipt::where('id', $receiptId)->lockForUpdate()->firstOrFail();

            if (! $receipt->isDraft()) {
                throw new ReceiptAlreadyPostedException(
                    "Receipt #{$receipt->id} is not a draft and cannot be edited."
                );
            }

            $receipt->update([
                'supplier_id' => $data->supplierId,
                'destination_location_id' => $data->destinationLocationId,
                'reference' => $data->reference,
                'receipt_date' => $data->receiptDate,
                'notes' => $data->notes,
            ]);

            $receipt->lines()->delete();

            foreach ($data->lines as $lineData) {
                $this->createLine($receipt, $lineData);
            }

            return $this->freshReceipt($receipt);
        });
    }

    /**
     * @throws ReceiptAlreadyPostedException if the Receipt is not a draft
     */
    public function deleteDraft(int $receiptId): void
    {
        DB::transaction(function () use ($receiptId) {
            $receipt = Receipt::where('id', $receiptId)->lockForUpdate()->firstOrFail();

            if (! $receipt->isDraft()) {
                throw new ReceiptAlreadyPostedException(
                    "Receipt #{$receipt->id} is not a draft and cannot be deleted."
                );
            }

            $receipt->delete();
        });
    }

    /**
     * Post a draft Receipt: for every line, atomically receive its base
     * units into Stock (via StockMutationService, exact #430 lock/race
     * pattern), write immutable StockMovement+StockMovementLine evidence,
     * and update the destination Stock row's weighted-average cost.
     *
     * Locking the Receipt header row itself for the duration of this
     * transaction, then checking isDraft() under that lock, is what makes
     * "duplicate/concurrent posting cannot apply the same receipt twice"
     * hold: a second concurrent call blocks on the same row lock and, once
     * it proceeds, finds status already POSTED.
     *
     * @throws ReceiptAlreadyPostedException|ReceiptAlreadyReversedException|ReceiptDestinationUnavailableException|ReceiptVariantUnavailableException
     */
    public function postReceipt(int $receiptId, int $userId): Receipt
    {
        return DB::transaction(function () use ($receiptId, $userId) {
            $receipt = Receipt::where('id', $receiptId)->lockForUpdate()->firstOrFail();

            if ($receipt->isPosted()) {
                throw new ReceiptAlreadyPostedException("Receipt #{$receipt->id} is already posted.");
            }

            if ($receipt->isReversed()) {
                throw new ReceiptAlreadyReversedException("Receipt #{$receipt->id} has been reversed and cannot be posted again.");
            }

            $destination = InventoryLocation::where('id', $receipt->destination_location_id)
                ->lockForUpdate()
                ->first();

            if (! $destination) {
                throw new ReceiptDestinationUnavailableException(
                    "Receipt #{$receipt->id}'s destination location is no longer available."
                );
            }

            $lines = $receipt->lines()->with('presentation.itemVariant')->get();

            foreach ($lines as $line) {
                $itemVariant = $line->presentation->itemVariant;

                if (! $itemVariant) {
                    throw new ReceiptVariantUnavailableException(
                        "Receipt #{$receipt->id} references a Product Variant that is no longer available."
                    );
                }

                $baseUnits = (float) $line->base_units_received;

                // One posting primitive per line (#567): locks/creates Stock,
                // blends the effective unit cost, and appends immutable
                // evidence. Source identity is explicit via
                // related_type/related_id/related_line_id — replaying the same
                // receipt line (queue retry, import) returns the existing
                // movement instead of incrementing Stock twice.
                $this->entryPosting->post(new InventoryEntryPostingData(
                    inventoryLocationId: $receipt->destination_location_id,
                    itemVariantId: $itemVariant->id,
                    baseQuantity: $baseUnits,
                    reason: StockMovement::REASON_PURCHASE_RECEIPT,
                    userId: $userId,
                    unitCost: (float) $line->effective_unit_cost,
                    reference: $receipt->reference,
                    sourceType: Receipt::class,
                    sourceId: $receipt->id,
                    sourceLineId: $line->id,
                    movementMeta: [
                        'received_packages' => (float) $line->received_packages,
                        'bonus_packages' => (float) $line->bonus_packages,
                        'presentation_factor' => (float) $line->presentation_factor,
                    ],
                    line: new InventoryEntryLineData(
                        // The base-unit UOM is the variant's own stock UOM — a
                        // purchase package (Box x24, etc.) is not itself a
                        // UnitOfMeasure, so unlike OpeningBalance (a real
                        // entry-UOM -> base-UOM conversion) this line is
                        // expressed natively in base units; conversion_factor
                        // still snapshots the package factor for traceability.
                        uomId: $itemVariant->uom_id,
                        qty: $baseUnits,
                        baseQty: $baseUnits,
                        conversionFactor: (float) $line->presentation_factor,
                        unitCost: (float) $line->effective_unit_cost,
                        lineTotal: (float) $line->net_acquisition_amount,
                    ),
                ));
            }

            $receipt->update([
                'status' => Receipt::STATUS_POSTED,
                'posted_at' => now(),
                'posted_by_user_id' => $userId,
            ]);

            return $this->freshReceipt($receipt);
        });
    }

    /**
     * Reverse a posted Receipt: for every line, decrease Stock.on_hand by
     * the base units it received (reusing Stock's own guarded
     * decreaseOnHand() — the #430 invariant), and write mirroring
     * StockMovement evidence. Blocked once on-hand has fallen below what
     * the receipt added — the "reversal boundary" #432 asks for.
     *
     * Weighted-average cost is intentionally left untouched on reversal:
     * unwinding a weighted average precisely requires lot-level tracking
     * this codebase doesn't have yet (see #434), so adjusting it here would
     * just trade one approximation for another.
     *
     * @throws ReceiptNotPostedException|ReceiptAlreadyReversedException|ReceiptReversalBoundaryException|ReceiptVariantUnavailableException
     */
    public function reverseReceipt(int $receiptId, int $userId, ?string $reason): Receipt
    {
        return DB::transaction(function () use ($receiptId, $userId, $reason) {
            $receipt = Receipt::where('id', $receiptId)->lockForUpdate()->firstOrFail();

            if ($receipt->isDraft()) {
                throw new ReceiptNotPostedException("Receipt #{$receipt->id} was never posted; nothing to reverse.");
            }

            if ($receipt->isReversed()) {
                throw new ReceiptAlreadyReversedException("Receipt #{$receipt->id} has already been reversed.");
            }

            $lines = $receipt->lines()->with('presentation.itemVariant')->get();

            foreach ($lines as $line) {
                $this->reverseReceiptLine($receipt, $line, $userId, $reason);
            }

            $receipt->update([
                'status' => Receipt::STATUS_REVERSED,
                'reversed_at' => now(),
                'reversed_by_user_id' => $userId,
                'reversal_reason' => $reason,
            ]);

            return $this->freshReceipt($receipt);
        });
    }

    /**
     * Reverse a single receipt line: unwind its base units from destination
     * Stock and write immutable, causally-linked compensating StockMovement
     * evidence, flipping the original PURCHASE_RECEIPT movement to REVERSED.
     *
     * @throws ReceiptVariantUnavailableException|ReceiptReversalBoundaryException|ReceiptAlreadyReversedException
     */
    private function reverseReceiptLine(Receipt $receipt, ReceiptLine $line, int $userId, ?string $reason): void
    {
        $itemVariant = $line->presentation->itemVariant;

        if (! $itemVariant) {
            throw new ReceiptVariantUnavailableException(
                "Receipt #{$receipt->id} references a Product Variant that is no longer available."
            );
        }

        $baseUnits = (float) $line->base_units_received;

        $originalMovement = $this->lockReversibleReceiptMovement($receipt, $line, $itemVariant->id);

        $stock = Stock::where('inventory_location_id', $receipt->destination_location_id)
            ->where('item_variant_id', $itemVariant->id)
            ->lockForUpdate()
            ->first();

        if (! $stock) {
            throw new ReceiptReversalBoundaryException(
                "Cannot reverse receipt #{$receipt->id}: no stock record remains for variant #{$itemVariant->id} at the destination location."
            );
        }

        try {
            $stock->decreaseOnHand($baseUnits);
        } catch (InvalidStockBalanceException $e) {
            throw new ReceiptReversalBoundaryException(
                "Cannot reverse receipt #{$receipt->id}: stock has already been consumed below the received amount. {$e->getMessage()}"
            );
        }

        $movement = StockMovement::create([
            'from_location_id' => $receipt->destination_location_id,
            'to_location_id' => null,
            'item_variant_id' => $itemVariant->id,
            'user_id' => $userId,
            'qty' => $baseUnits,
            'reason' => StockMovement::REASON_PURCHASE_RECEIPT_REVERSAL,
            'status' => StockMovement::STATUS_POSTED,
            'reference' => $receipt->reference,
            'related_id' => $receipt->id,
            'related_type' => Receipt::class,
            'related_line_id' => $line->id,
            'reverses_stock_movement_id' => $originalMovement->id,
            'reversed_by_user_id' => null,
            'notes' => $reason,
            'meta' => [],
            'posted_at' => now(),
        ]);

        $originalMovement->forceFill([
            'status' => StockMovement::STATUS_REVERSED,
            'reversed_at' => now(),
            'reversed_by_user_id' => $userId,
            'reversal_reason' => $reason,
        ])->save();

        StockMovementLine::create([
            'stock_movement_id' => $movement->id,
            'item_variant_id' => $itemVariant->id,
            'uom_id' => $itemVariant->uom_id,
            'qty' => $baseUnits,
            'base_qty' => $baseUnits,
            'conversion_factor' => $line->presentation_factor,
            'unit_cost' => $line->effective_unit_cost,
            'line_total' => $line->net_acquisition_amount,
            'meta' => [],
        ]);
    }

    /**
     * Resolve and lock the posted PURCHASE_RECEIPT movement a line's reversal
     * compensates, *before* any balance is touched, so an inconsistent audit
     * state fails atomically (#438). Looked up regardless of status: if it was
     * already reversed elsewhere (e.g. via the shared StockMovementReverser),
     * reversing the receipt again would otherwise subtract the quantity a
     * second time from unrelated stock and leave an unlinked compensation.
     *
     * @throws ReceiptReversalBoundaryException|ReceiptAlreadyReversedException
     */
    private function lockReversibleReceiptMovement(Receipt $receipt, ReceiptLine $line, int $itemVariantId): StockMovement
    {
        $originalMovement = StockMovement::query()
            ->where('related_type', Receipt::class)
            ->where('related_id', $receipt->id)
            ->where('related_line_id', $line->id)
            ->where('item_variant_id', $itemVariantId)
            ->where('reason', StockMovement::REASON_PURCHASE_RECEIPT)
            ->lockForUpdate()
            ->first();

        if (! $originalMovement) {
            throw new ReceiptReversalBoundaryException(
                "Cannot reverse receipt #{$receipt->id}: its posted stock movement for line #{$line->id} is missing."
            );
        }

        if (! $originalMovement->isPosted()) {
            throw new ReceiptAlreadyReversedException(
                "Cannot reverse receipt #{$receipt->id}: its stock movement for line #{$line->id} has already been reversed."
            );
        }

        return $originalMovement;
    }

    private function createLine(Receipt $receipt, ReceiptLineData $lineData): ReceiptLine
    {
        $presentation = VariantPurchasePresentation::with('template')
            ->findOrFail($lineData->variantPurchasePresentationId);

        $factor = (float) $presentation->template->base_unit_quantity;

        $baseUnitsReceived = $lineData->receivedPackages * $factor;
        $netAcquisitionAmount = $lineData->grossAmount - $lineData->discounts + $lineData->allocatedExpenses + $lineData->nonRecoverableTaxes;
        $effectiveUnitCost = $baseUnitsReceived > 0 ? $netAcquisitionAmount / $baseUnitsReceived : 0.0;

        return ReceiptLine::create([
            'receipt_id' => $receipt->id,
            'variant_purchase_presentation_id' => $presentation->id,
            'supplier_offering_id' => $lineData->supplierOfferingId,
            'ordered_packages' => $lineData->orderedPackages,
            'received_packages' => $lineData->receivedPackages,
            'bonus_packages' => $lineData->bonusPackages,
            'presentation_factor' => $factor,
            'gross_amount' => $lineData->grossAmount,
            'discounts' => $lineData->discounts,
            'allocated_expenses' => $lineData->allocatedExpenses,
            'non_recoverable_taxes' => $lineData->nonRecoverableTaxes,
            'net_acquisition_amount' => $netAcquisitionAmount,
            'base_units_received' => $baseUnitsReceived,
            'effective_unit_cost' => $effectiveUnitCost,
            'meta' => [],
        ]);
    }

    private function freshReceipt(Receipt $receipt): Receipt
    {
        return $receipt->fresh([
            'lines.presentation.itemVariant.item',
            'lines.presentation.template',
            'lines.supplierOffering',
            'supplier',
            'destinationLocation',
            'createdByUser',
            'postedByUser',
            'reversedByUser',
        ]);
    }
}
