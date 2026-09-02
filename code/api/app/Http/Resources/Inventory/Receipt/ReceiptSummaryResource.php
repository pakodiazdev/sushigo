<?php

declare(strict_types=1);

namespace App\Http\Resources\Inventory\Receipt;

use App\Http\Resources\BaseResource;
use App\Models\Receipt;

/**
 * Bounded summary row for the Purchase Receipt history list (#586).
 *
 * Deliberately omits `lines` and other heavyweight nested evidence — the list
 * is a read model scaled to browse long histories, and full line data is
 * fetched from the detail endpoint (ShowReceiptController / ReceiptResource).
 * `total` is the one aggregate the history table needs, summed in SQL via
 * `withSum` so the list path never hydrates lines.
 *
 * @mixin Receipt
 */
class ReceiptSummaryResource extends BaseResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->public_id,
            'status' => $this->status,
            'reference' => $this->reference,
            'receipt_date' => $this->receipt_date?->toDateString(),
            'notes' => $this->notes,
            'total' => (float) ($this->lines_sum_net_acquisition_amount ?? 0),
            'supplier' => $this->whenLoaded('supplier', fn () => [
                'id' => $this->supplier->public_id,
                'code' => $this->supplier->code,
                'name' => $this->supplier->name,
            ]),
            'destination_location' => $this->whenLoaded('destinationLocation', fn () => [
                'id' => $this->destinationLocation->public_id,
                'name' => $this->destinationLocation->name,
            ]),
            'posted_at' => $this->posted_at?->toIso8601String(),
            'reversed_at' => $this->reversed_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
