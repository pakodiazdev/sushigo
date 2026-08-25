<?php

namespace App\Services\Pricing;

use App\Models\PriceList;
use Illuminate\Support\Facades\DB;

/**
 * A PriceList's priority is read by PriceListAssignmentService's
 * guardNoPriorityTie() at assignment-write time, but a priority change here
 * can silently create the exact same tie between two already-existing
 * assignments without either of them being touched — this is what
 * guardPriorityChangeIsSafe() closes.
 */
class PriceListService
{
    public function __construct(private PriceListAssignmentService $assignmentService) {}

    public function update(PriceList $priceList, array $data): PriceList
    {
        return DB::transaction(function () use ($priceList, $data) {
            if (array_key_exists('priority', $data)) {
                $this->assignmentService->guardPriorityChangeIsSafe($priceList, $data['priority']);
            }

            $priceList->update($data);

            return $priceList->fresh();
        });
    }
}
