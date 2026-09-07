<?php

declare(strict_types=1);

namespace App\Http\Resources\Inventory\StockTransfer;

use App\Http\Resources\BaseResource;
use App\Http\Resources\Inventory\StockTransfer\Concerns\SerializesAccessibleTransferLocation;
use App\Models\StockTransfer;
use App\Support\Access\OperatingUnitScope;

/** @mixin StockTransfer */
class StockTransferResource extends BaseResource
{
    use SerializesAccessibleTransferLocation;

    public function toArray($request): array
    {
        return [
            'id' => $this->public_id,
            'status' => $this->status,
            'reference' => $this->reference,
            'transfer_date' => $this->transfer_date?->toDateString(),
            'notes' => $this->notes,
            // Whether *this* caller may run the mutating actions (edit/delete/
            // post/reverse). The read scope lets a caller who can reach only one
            // endpoint unit open a cross-unit transfer's detail, but every
            // mutation requires access to *both* units — the UI reads this flag
            // rather than the global `stock.manage` permission alone.
            'can_mutate' => $request->user() !== null
                && $request->user()->can('stock.manage')
                && app(OperatingUnitScope::class)->canMutateStockTransfer($request->user(), $this->resource),
            // An endpoint in an Operating Unit this caller cannot access is
            // nulled out — a cross-unit transfer is readable via the *other*
            // endpoint but must not leak the foreign Location's name/ID (#574).
            'source_location' => $this->whenLoaded(
                'sourceLocation',
                fn () => $this->accessibleLocationRef($this->sourceLocation, $request),
            ),
            'destination_location' => $this->whenLoaded(
                'destinationLocation',
                fn () => $this->accessibleLocationRef($this->destinationLocation, $request),
            ),
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
