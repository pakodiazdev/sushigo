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
use App\Models\ItemVariant;
use App\Models\Receipt;
use App\Models\ReceiptLine;
use App\Models\Stock;
use App\Models\StockMovement;
use App\Models\StockMovementLine;
use App\Models\User;
use App\Models\VariantPurchasePresentation;
use App\Support\Access\OperatingUnitScope;
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
        private readonly OperatingUnitScope $scope,
        private readonly VariantLocationAssignmentEnsurer $assignmentEnsurer,
    ) {}

    public function createDraft(SaveReceiptData $data): Receipt
    {
        return DB::transaction(function () use ($data) {
            $this->assertActorMayUseDestination($data->destinationLocationId, $data->actingUserId);

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

            $this->assertActorMayMutateLockedReceipt($receipt, $data->actingUserId);
            $this->assertActorMayUseDestination($data->destinationLocationId, $data->actingUserId);

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
    public function deleteDraft(int $receiptId, int $userId): void
    {
        DB::transaction(function () use ($receiptId, $userId) {
            $receipt = Receipt::where('id', $receiptId)->lockForUpdate()->firstOrFail();

            $this->assertActorMayMutateLockedReceipt($receipt, $userId);

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

            $this->assertActorMayMutateLockedReceipt($receipt, $userId);

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

            // Destination eligibility is re-checked here, under the row lock,
            // because the Location's state can change while the Receipt sits as a
            // draft (#572): a save-time-valid destination that has since been
            // deactivated or had `can_receive_purchases` cleared must block
            // posting with a stable 409 and roll back every line, rather than
            // landing supplier stock in a Location that can no longer receive it.
            if (! $destination->is_active || ! $destination->can_receive_purchases) {
                throw new ReceiptDestinationUnavailableException(
                    "Receipt #{$receipt->id}'s destination location can no longer receive purchases."
                );
            }

            $lines = $receipt->lines()->with('presentation')->get();

            // Lock every referenced Variant row up front, ascending by id, so a
            // concurrent catalogue update deactivating a variant is serialised
            // against this post (its `is_active` can't flip after the check
            // below and still let stock/assignment land) and two concurrent
            // posts sharing variants can't deadlock. A soft-deleted variant is
            // simply absent from the result and rejected the same as before.
            $variantIds = $lines->pluck('presentation.item_variant_id')
                ->filter()
                ->unique()
                ->sort()
                ->values()
                ->all();

            $lockedVariants = $variantIds === []
                ? collect()
                : ItemVariant::whereIn('id', $variantIds)
                    ->orderBy('id')
                    ->lockForUpdate()
                    ->get()
                    ->keyBy('id');

            foreach ($lines as $line) {
                $itemVariant = $lockedVariants->get($line->presentation->item_variant_id);

                // A soft-deleted variant is absent from the locked set; a
                // *deactivated* one is present but outside the manageable
                // catalogue. Both must reject posting rather than land stock —
                // and, crucially, an assignment — for a variant that
                // `AssignVariantToLocationController` would refuse (#569/#572).
                if (! $itemVariant || ! $itemVariant->is_active) {
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

                // Ensure the assortment assignment (#569/#572) *after* the entry
                // posting above has taken and still holds the (location, variant)
                // Stock-row lock. `UnassignVariantFromLocationController` guards on
                // that exact row (by pair, zeroed rows included), so ordering the
                // ensure after the lock serializes this against a concurrent
                // unassignment: either it blocks and then 409s on our now-positive
                // balance, or it won the race first and soft-deleted the
                // assignment, which this call reactivates. Doing it before the
                // lock leaves a window where the pair ends up with stock but no
                // live assignment. Idempotent, transactional, writes no Stock row
                // or movement of its own. (A genuine first-ever receipt that
                // creates the Stock row from scratch has no row to lock — that
                // assortment-vs-inbound race is a consuming-workflow concern,
                // #570–#574, out of scope here, per the unassign controller.)
                $this->assignmentEnsurer->ensure($receipt->destination_location_id, $itemVariant->id);
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

            $this->assertActorMayMutateLockedReceipt($receipt, $userId);

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

    /**
     * Re-assert horizontal (Operating Unit) authorization against a Receipt
     * already locked by the surrounding transaction.
     *
     * The by-ID controllers run AssertsReceiptOperatingUnitAccess *before* the
     * transaction, on the route-bound model. Between that check and this lock a
     * scope change — a membership revoked, or a bypass-role user transferring a
     * still-draft Receipt to another unit — would otherwise let a scoped caller
     * update / delete / post / reverse a Receipt they can no longer access
     * (#586). Checked here under the lock, against the Receipt's current
     * destination, it cannot be raced. `destinationLocation` is a `withTrashed()`
     * relation, so a soft-deleted destination still resolves to its owning unit.
     * Bypass roles (`super-admin` / `admin`) pass.
     */
    private function assertActorMayMutateLockedReceipt(Receipt $receipt, int $userId): void
    {
        $this->scope->assertCanAccessLocation(User::findOrFail($userId), $receipt->destinationLocation);
    }

    /**
     * Assert the actor may write into the destination named by a create/update
     * payload, re-checked here rather than trusting the FormRequest's
     * `accessibleDestinationLocationRule`. This keeps the Service self-sufficient
     * on the horizontal-authorization contract (`OperatingUnitScope` is the one
     * source of truth for every layer), so a create or a transfer cannot land a
     * Receipt in a unit the actor can't access even if it reaches the Service by
     * a path that skipped request validation. Bypass roles pass.
     *
     * Note: like every `OperatingUnitScope` check in the codebase, this reads the
     * `operating_unit_users` membership without locking it, so it is not
     * serialized against a membership revoked in the same instant. #572 hardened
     * the Receipt *destination* contract (active + purchase-receiving, re-checked
     * under lock at post time) but deliberately left that whole-domain
     * membership-lock question open — it is a property of `OperatingUnitScope`
     * itself, not of this service.
     */
    private function assertActorMayUseDestination(int $destinationLocationId, int $userId): void
    {
        $this->scope->assertCanAccessLocation(User::findOrFail($userId), $destinationLocationId);
    }

    private function freshReceipt(Receipt $receipt): Receipt
    {
        return $receipt->fresh([
            'lines.presentation.itemVariant.item',
            'lines.presentation.template',
            'lines.supplierOffering',
            'supplier',
            'destinationLocation.operatingUnit',
            'createdByUser',
            'postedByUser',
            'reversedByUser',
        ]);
    }
}
