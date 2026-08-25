<?php

namespace App\Services\Inventory;

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
 * into Stock, reusing StockMutationService's lockForUpdate + race-recovery
 * pattern from #430 for every location+variant it touches.
 */
class ReceiptService
{
    public function __construct(
        private readonly StockMutationService $stockMutation,
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

                $this->stockMutation->receiveInto($receipt->destination_location_id, $itemVariant->id, $baseUnits);
                $this->applyWeightedAverageCostOnReceipt($receipt->destination_location_id, $itemVariant->id, $baseUnits, (float) $line->effective_unit_cost);

                $movement = StockMovement::create([
                    'from_location_id' => null,
                    'to_location_id' => $receipt->destination_location_id,
                    'item_variant_id' => $itemVariant->id,
                    'user_id' => $userId,
                    'qty' => $baseUnits,
                    'reason' => StockMovement::REASON_PURCHASE_RECEIPT,
                    'status' => StockMovement::STATUS_POSTED,
                    'reference' => $receipt->reference,
                    'related_id' => $receipt->id,
                    'related_type' => Receipt::class,
                    'meta' => [
                        'receipt_line_id' => $line->id,
                        'received_packages' => (float) $line->received_packages,
                        'bonus_packages' => (float) $line->bonus_packages,
                        'presentation_factor' => (float) $line->presentation_factor,
                    ],
                    'posted_at' => now(),
                ]);

                StockMovementLine::create([
                    'stock_movement_id' => $movement->id,
                    'item_variant_id' => $itemVariant->id,
                    // The base-unit UOM is the variant's own stock UOM — a purchase
                    // package (Box x24, etc.) is not itself a UnitOfMeasure, so unlike
                    // OpeningBalance (a real entry-UOM -> base-UOM conversion) this line
                    // is expressed natively in base units; conversion_factor still
                    // records the snapshotted package factor for traceability.
                    'uom_id' => $itemVariant->uom_id,
                    'qty' => $baseUnits,
                    'base_qty' => $baseUnits,
                    'conversion_factor' => $line->presentation_factor,
                    'unit_cost' => $line->effective_unit_cost,
                    'line_total' => $line->net_acquisition_amount,
                    'meta' => [],
                ]);
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
                $itemVariant = $line->presentation->itemVariant;

                if (! $itemVariant) {
                    throw new ReceiptVariantUnavailableException(
                        "Receipt #{$receipt->id} references a Product Variant that is no longer available."
                    );
                }

                $baseUnits = (float) $line->base_units_received;

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
                    'notes' => $reason,
                    'meta' => [
                        'receipt_line_id' => $line->id,
                    ],
                    'posted_at' => now(),
                ]);

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

            $receipt->update([
                'status' => Receipt::STATUS_REVERSED,
                'reversed_at' => now(),
                'reversed_by_user_id' => $userId,
                'reversal_reason' => $reason,
            ]);

            return $this->freshReceipt($receipt);
        });
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

    /**
     * Maintain Stock.weighted_avg_cost — deliberately not ItemVariant's own
     * avg_unit_cost/last_unit_cost: #432's issue text is explicit that
     * acquisition cost "must not be entered on Product or Variant".
     * Reconciling this against OpeningBalanceService's divergent
     * Variant-level write is #434's job, not this one's.
     */
    private function applyWeightedAverageCostOnReceipt(int $locationId, int $itemVariantId, float $qtyAdded, float $unitCost): void
    {
        if ($qtyAdded <= 0) {
            return;
        }

        $stock = Stock::where('inventory_location_id', $locationId)
            ->where('item_variant_id', $itemVariantId)
            ->lockForUpdate()
            ->first();

        if (! $stock) {
            return;
        }

        $priorOnHand = max(0.0, (float) $stock->on_hand - $qtyAdded);
        $priorAvg = (float) $stock->weighted_avg_cost;
        $totalOnHand = $priorOnHand + $qtyAdded;

        $newAvg = $totalOnHand > 0
            ? (($priorOnHand * $priorAvg) + ($qtyAdded * $unitCost)) / $totalOnHand
            : $unitCost;

        $stock->update(['weighted_avg_cost' => $newAvg]);
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
