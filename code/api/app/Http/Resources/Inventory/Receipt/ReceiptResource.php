<?php

declare(strict_types=1);

namespace App\Http\Resources\Inventory\Receipt;

use App\Http\Resources\BaseResource;
use App\Models\Receipt;

/** @mixin Receipt */
class ReceiptResource extends BaseResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->public_id,
            'status' => $this->status,
            'reference' => $this->reference,
            'receipt_date' => $this->receipt_date?->toDateString(),
            'notes' => $this->notes,
            'supplier' => $this->whenLoaded('supplier', fn () => [
                'id' => $this->supplier->public_id,
                'code' => $this->supplier->code,
                'name' => $this->supplier->name,
            ]),
            'destination_location' => $this->whenLoaded('destinationLocation', fn () => [
                'id' => $this->destinationLocation->public_id,
                'name' => $this->destinationLocation->name,
            ]),
            'lines' => ReceiptLineResource::collection($this->whenLoaded('lines')),
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
