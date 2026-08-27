<?php

namespace App\Http\Controllers\Api\V1\Stock\Concerns;

use App\Models\Stock;
use App\Models\VariantLocationReplenishmentPolicy;
use Illuminate\Support\Collection;

trait SummarizesStock
{
    /**
     * @return array<string, mixed>
     */
    protected function stockMoneyFields(Stock $stock, ?VariantLocationReplenishmentPolicy $policy = null): array
    {
        return [
            'on_hand' => (float) $stock->on_hand,
            'reserved' => (float) $stock->reserved,
            'available' => (float) $stock->available,
            'weighted_avg_cost' => (float) $stock->weighted_avg_cost,
            'total_value' => (float) ($stock->on_hand * $stock->weighted_avg_cost),
            'min_stock' => $policy ? (float) $policy->min_stock : null,
            'max_stock' => $policy ? (float) $policy->max_stock : null,
            'is_low_stock' => $policy !== null && (float) $stock->on_hand <= (float) $policy->min_stock,
        ];
    }

    /**
     * @param  Collection<int, Stock>  $stockRecords
     * @return array<string, mixed>
     */
    protected function stockTotals(Collection $stockRecords): array
    {
        return [
            'total_on_hand' => (float) $stockRecords->sum('on_hand'),
            'total_reserved' => (float) $stockRecords->sum('reserved'),
            'total_available' => (float) $stockRecords->sum('available'),
        ];
    }

    /**
     * How many of the given stock rows are low against their resolved policy —
     * $policies is keyed by the id used to look a row's policy up ($keyField).
     *
     * @param  Collection<int, Stock>  $stockRecords
     * @param  Collection<int, VariantLocationReplenishmentPolicy>  $policies
     */
    protected function countLowStock(Collection $stockRecords, Collection $policies, string $keyField): int
    {
        return $stockRecords->filter(function (Stock $stock) use ($policies, $keyField) {
            $policy = $policies->get($stock->{$keyField});

            return $policy !== null && (float) $stock->on_hand <= (float) $policy->min_stock;
        })->count();
    }
}
