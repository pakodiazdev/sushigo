<?php

declare(strict_types=1);

namespace App\Http\Resources\Inventory\StockTransfer;

use App\Http\Resources\BaseResource;
use App\Models\StockTransfer;

/**
 * Bounded summary row for the Stock Transfer history list. Omits `lines` — full
 * line evidence is fetched from the detail endpoint. `line_count` is the one
 * aggregate the table needs, counted in SQL via `withCount`.
 *
 * @mixin StockTransfer
 */
class StockTransferSummaryResource extends BaseResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->public_id,
            'status' => $this->status,
            'reference' => $this->reference,
            'transfer_date' => $this->transfer_date?->toDateString(),
            'notes' => $this->notes,
            'line_count' => (int) ($this->lines_count ?? 0),
            'source_location' => $this->whenLoaded('sourceLocation', fn () => [
                'id' => $this->sourceLocation->public_id,
                'name' => $this->sourceLocation->name,
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
