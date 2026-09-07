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
            // Enough destination context for an unambiguous detail view (#572):
            // its type, receiving capability, active flag, and owning Operating
            // Unit — so the UI can show *where* the stock landed and why the
            // Location was (or was not) eligible, without a second lookup.
            'destination_location' => $this->whenLoaded('destinationLocation', fn () => [
                'id' => $this->destinationLocation->public_id,
                'name' => $this->destinationLocation->name,
                'type' => $this->destinationLocation->type,
                'is_active' => $this->destinationLocation->is_active,
                'can_receive_purchases' => $this->destinationLocation->can_receive_purchases,
                'operating_unit' => $this->destinationLocation->relationLoaded('operatingUnit') && $this->destinationLocation->operatingUnit
                    ? [
                        'id' => $this->destinationLocation->operatingUnit->id,
                        'name' => $this->destinationLocation->operatingUnit->name,
                        'type' => $this->destinationLocation->operatingUnit->type,
                    ]
                    : null,
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
