<?php

declare(strict_types=1);

namespace App\Http\Resources\Inventory\StockTransfer;

use App\Http\Resources\BaseResource;
use App\Models\StockTransferLine;

/** @mixin StockTransferLine */
class StockTransferLineResource extends BaseResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->public_id,
            'variant' => $this->whenLoaded('itemVariant', fn () => $this->itemVariant ? [
                'id' => $this->itemVariant->public_id,
                'code' => $this->itemVariant->code,
                'name' => $this->itemVariant->name,
            ] : null),
            'entry_uom' => $this->whenLoaded('entryUom', fn () => $this->entryUom ? [
                'id' => $this->entryUom->public_id,
                'code' => $this->entryUom->code,
                'symbol' => $this->entryUom->symbol,
            ] : null),
            'entry_quantity' => (float) $this->entry_quantity,
            'conversion_factor' => (float) $this->conversion_factor,
            'base_quantity' => (float) $this->base_quantity,
            'source_unit_cost' => $this->source_unit_cost !== null ? (float) $this->source_unit_cost : null,
        ];
    }
}
