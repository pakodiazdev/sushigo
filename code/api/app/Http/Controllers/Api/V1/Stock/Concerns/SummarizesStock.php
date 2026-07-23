<?php

namespace App\Http\Controllers\Api\V1\Stock\Concerns;

use App\Models\Stock;
use Illuminate\Support\Collection;

trait SummarizesStock
{
    /**
     * @return array<string, mixed>
     */
    protected function stockMoneyFields(Stock $stock): array
    {
        return [
            'on_hand' => (float) $stock->on_hand,
            'reserved' => (float) $stock->reserved,
            'available' => (float) $stock->available,
            'weighted_avg_cost' => (float) $stock->weighted_avg_cost,
            'total_value' => (float) ($stock->on_hand * $stock->weighted_avg_cost),
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
}
