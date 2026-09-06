<?php

declare(strict_types=1);

namespace App\Http\Resources\Inventory\StockTransfer;

use App\Http\Resources\BaseResource;
use App\Models\StockTransfer;

/** @mixin StockTransfer */
class StockTransferResource extends BaseResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->public_id,
            'status' => $this->status,
            'reference' => $this->reference,
            'transfer_date' => $this->transfer_date?->toDateString(),
            'notes' => $this->notes,
            'source_location' => $this->whenLoaded('sourceLocation', fn () => [
                'id' => $this->sourceLocation->public_id,
                'name' => $this->sourceLocation->name,
            ]),
            'destination_location' => $this->whenLoaded('destinationLocation', fn () => [
                'id' => $this->destinationLocation->public_id,
                'name' => $this->destinationLocation->name,
            ]),
            'lines' => StockTransferLineResource::collection($this->whenLoaded('lines')),
            'posted_at' => $this->posted_at?->toIso8601String(),
            'posted_by' => $this->whenLoaded('postedByUser', fn () => $this->postedByUser ? [
                'id' => $this->postedByUser->id,
                'name' => $this->postedByUser->name,
            ] : null),
            'reversed_at' => $this->reversed_at?->toIso8601String(),
            'reversed_by' => $this->whenLoaded('reversedByUser', fn () => $this->reversedByUser ? [
                'id' => $this->reversedByUser->id,
                'name' => $this->reversedByUser->name,
            ] : null),
            'reversal_reason' => $this->reversal_reason,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
