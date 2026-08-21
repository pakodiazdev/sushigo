<?php

namespace App\Services\Inventory;

use App\Models\ItemVariant;
use App\Models\VariantPurchasePresentation;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Owns the "one active default per Variant" invariant
 * (doc/architecture/product-catalog/product-catalog-architecture.en.md §3.3).
 * The partial unique index on (item_variant_id) where is_default=true and
 * is_active=true and deleted_at is null is the DB-level backstop; this
 * service is what keeps a normal (non-racing) request from ever hitting it —
 * it clears the previous default itself, inside the same locked transaction,
 * mirroring StockMutationService::lockAndGet()'s lockForUpdate() pattern.
 */
class VariantPurchasePresentationService
{
    public function create(int $itemVariantId, array $data): VariantPurchasePresentation
    {
        return DB::transaction(function () use ($itemVariantId, $data) {
            $this->lockVariantPresentations($itemVariantId);

            // StoreVariantPurchasePresentationRequest::validateTemplateAssignable()
            // already rejects a duplicate assignment, but that check runs
            // before this transaction's lock is acquired. Two concurrent
            // requests assigning the same template can both pass it, then
            // race to insert once the lock is released one at a time —
            // rechecking here, now serialized by the lock, turns the loser
            // into the same documented 422 instead of an uncaught partial
            // unique index violation.
            $this->ensureNotDuplicateAssignment($itemVariantId, (int) $data['template_id']);

            if ($data['is_default'] ?? false) {
                $this->clearExistingDefault($itemVariantId);
            }

            $data['item_variant_id'] = $itemVariantId;

            return VariantPurchasePresentation::create($data);
        });
    }

    public function update(VariantPurchasePresentation $presentation, array $data): VariantPurchasePresentation
    {
        return DB::transaction(function () use ($presentation, $data) {
            $this->lockVariantPresentations($presentation->item_variant_id);

            // Evaluate the row's post-update state, not the raw request payload:
            // validated() doesn't cast is_default to a real PHP bool (an
            // 1/"1" input survives as-is), and a request that omits is_default
            // entirely while only flipping is_active back on can still turn an
            // already-default-but-inactive row into an active default. Either
            // case must still clear the previous default, or the partial
            // unique index raises a raw DB exception instead of this service
            // handling it cleanly.
            $willBeDefault = (bool) ($data['is_default'] ?? $presentation->is_default);
            $willBeActive = (bool) ($data['is_active'] ?? $presentation->is_active);

            if ($willBeDefault && $willBeActive) {
                $this->clearExistingDefault($presentation->item_variant_id, $presentation->id);
            }

            $presentation->update($data);

            return $presentation->fresh();
        });
    }

    /**
     * Locks the parent Variant row in addition to any existing presentation
     * rows. Locking only variant_purchase_presentations rows locks nothing
     * when a Variant has zero presentations yet, so two concurrent first
     * assignments could both pass validation and race past this point;
     * locking the always-existing parent ItemVariant row serializes that
     * case too.
     */
    private function lockVariantPresentations(int $itemVariantId): void
    {
        ItemVariant::where('id', $itemVariantId)->lockForUpdate()->first();
        VariantPurchasePresentation::where('item_variant_id', $itemVariantId)->lockForUpdate()->get();
    }

    private function clearExistingDefault(int $itemVariantId, ?int $exceptId = null): void
    {
        VariantPurchasePresentation::where('item_variant_id', $itemVariantId)
            ->where('is_default', true)
            ->when($exceptId, fn ($q) => $q->where('id', '!=', $exceptId))
            ->update(['is_default' => false]);
    }

    /**
     * @throws ValidationException
     */
    private function ensureNotDuplicateAssignment(int $itemVariantId, int $templateId): void
    {
        $alreadyAssigned = VariantPurchasePresentation::where('item_variant_id', $itemVariantId)
            ->where('template_id', $templateId)
            ->exists();

        if ($alreadyAssigned) {
            throw ValidationException::withMessages([
                'template_id' => 'This template is already assigned to this Variant.',
            ]);
        }
    }
}
