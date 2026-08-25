<?php

namespace App\Services\Pricing;

use App\Models\ItemVariant;
use App\Models\VariantPrice;
use App\Services\Pricing\Concerns\EvaluatesEffectiveRanges;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Owns the invariant that a single PriceList must never give two different
 * active, overlapping prices for the same Variant — the ambiguity
 * PriceResolutionService relies on never existing once it has picked a
 * PriceList to look inside.
 */
class VariantPriceService
{
    use EvaluatesEffectiveRanges;

    public function create(int $priceListId, array $data): VariantPrice
    {
        return DB::transaction(function () use ($priceListId, $data) {
            $data['price_list_id'] = $priceListId;

            $this->lockScope($data['item_variant_id'], $priceListId);

            if ($data['is_active'] ?? true) {
                $this->guardNoOverlap($data['item_variant_id'], $priceListId, $data['effective_from'], $data['effective_to'] ?? null);
            }

            return VariantPrice::create($data);
        });
    }

    public function update(VariantPrice $variantPrice, array $data): VariantPrice
    {
        return DB::transaction(function () use ($variantPrice, $data) {
            $itemVariantId = $data['item_variant_id'] ?? $variantPrice->item_variant_id;
            $effectiveFrom = $data['effective_from'] ?? $variantPrice->effective_from->toDateString();
            $effectiveTo = array_key_exists('effective_to', $data)
                ? $data['effective_to']
                : $variantPrice->effective_to?->toDateString();
            $willBeActive = array_key_exists('is_active', $data) ? (bool) $data['is_active'] : $variantPrice->is_active;

            $this->lockScope($itemVariantId, $variantPrice->price_list_id);

            if ($willBeActive) {
                $this->guardNoOverlap($itemVariantId, $variantPrice->price_list_id, $effectiveFrom, $effectiveTo, excludeId: $variantPrice->id);
            }

            $variantPrice->update($data);

            return $variantPrice->fresh();
        });
    }

    /**
     * Locks the parent ItemVariant row in addition to any existing
     * variant_prices rows. Locking only variant_prices rows locks nothing
     * when a Variant+PriceList pair has zero rows yet, so two concurrent
     * first inserts could both pass guardNoOverlap() and commit conflicting
     * active ranges; locking the always-existing parent ItemVariant row
     * serializes that case too (same pattern as
     * VariantPurchasePresentationService::lockVariantPresentations()).
     */
    private function lockScope(int $itemVariantId, int $priceListId): void
    {
        ItemVariant::where('id', $itemVariantId)->lockForUpdate()->first();

        VariantPrice::where('item_variant_id', $itemVariantId)
            ->where('price_list_id', $priceListId)
            ->lockForUpdate()
            ->get();
    }

    private function guardNoOverlap(
        int $itemVariantId,
        int $priceListId,
        string $effectiveFrom,
        ?string $effectiveTo,
        ?int $excludeId = null,
    ): void {
        $query = VariantPrice::query()
            ->active()
            ->where('item_variant_id', $itemVariantId)
            ->where('price_list_id', $priceListId)
            ->when($excludeId !== null, fn ($q) => $q->where('id', '!=', $excludeId));

        $conflict = $this->whereOverlapsRange($query, $effectiveFrom, $effectiveTo)->exists();

        if ($conflict) {
            throw ValidationException::withMessages([
                'effective_from' => 'Ya existe un precio activo para este Variant en esta Lista de Precios con un rango de fechas que se traslapa.',
            ]);
        }
    }
}
