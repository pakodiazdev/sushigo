<?php

declare(strict_types=1);

namespace App\Services\Inventory;

use App\Models\VariantLocationReplenishmentPolicy;
use Illuminate\Support\Collection;

/**
 * Resolves the effective replenishment policy for a (Inventory Location,
 * Variant) pair (#439).
 *
 * Today this is a direct lookup of the location-level policy. Operating-Unit
 * level defaults/inheritance are deliberately out of scope for #439 (Technical
 * Task 1 marks them optional); when they land, this class is the single place
 * the fallback chain is added — every consumer already calls through here.
 */
class ReplenishmentPolicyResolver
{
    public function resolve(int $inventoryLocationId, int $itemVariantId): ?VariantLocationReplenishmentPolicy
    {
        return VariantLocationReplenishmentPolicy::query()
            ->where('inventory_location_id', $inventoryLocationId)
            ->where('item_variant_id', $itemVariantId)
            ->first();
    }

    /**
     * Batch-resolve every location-level policy for a set of variants at one
     * location, keyed by `item_variant_id`, so a summary over many stock rows
     * costs one query instead of N.
     *
     * @param  iterable<int>  $itemVariantIds
     * @return Collection<int, VariantLocationReplenishmentPolicy>
     */
    public function resolveManyForLocation(int $inventoryLocationId, iterable $itemVariantIds): Collection
    {
        return VariantLocationReplenishmentPolicy::query()
            ->where('inventory_location_id', $inventoryLocationId)
            ->whereIn('item_variant_id', collect($itemVariantIds)->unique()->values())
            ->get()
            ->keyBy('item_variant_id');
    }

    /**
     * Batch-resolve every location-level policy for one variant across a set of
     * locations, keyed by `inventory_location_id`.
     *
     * @param  iterable<int>  $inventoryLocationIds
     * @return Collection<int, VariantLocationReplenishmentPolicy>
     */
    public function resolveManyForVariant(int $itemVariantId, iterable $inventoryLocationIds): Collection
    {
        return VariantLocationReplenishmentPolicy::query()
            ->where('item_variant_id', $itemVariantId)
            ->whereIn('inventory_location_id', collect($inventoryLocationIds)->unique()->values())
            ->get()
            ->keyBy('inventory_location_id');
    }

    /**
     * Resolve policies for a heterogeneous set of stock rows (mixed locations
     * and variants) in one query, keyed as "{locationId}:{variantId}".
     *
     * @param  iterable<\App\Models\Stock>  $stockRows
     * @return Collection<string, VariantLocationReplenishmentPolicy>
     */
    public function resolveByPairs(iterable $stockRows): Collection
    {
        $rows = collect($stockRows);

        if ($rows->isEmpty()) {
            return collect();
        }

        return VariantLocationReplenishmentPolicy::query()
            ->whereIn('inventory_location_id', $rows->pluck('inventory_location_id')->unique()->values())
            ->whereIn('item_variant_id', $rows->pluck('item_variant_id')->unique()->values())
            ->get()
            ->keyBy(fn (VariantLocationReplenishmentPolicy $p) => $p->inventory_location_id.':'.$p->item_variant_id);
    }

    /**
     * The resolved low-stock verdict for a given on-hand quantity: a stock row
     * with no resolved policy is never "low" — there is no configured reorder
     * point to compare against, so alerting on it would be a false positive.
     */
    public function isLow(float $onHand, ?VariantLocationReplenishmentPolicy $policy): bool
    {
        return $policy !== null && $onHand <= (float) $policy->min_stock;
    }
}
