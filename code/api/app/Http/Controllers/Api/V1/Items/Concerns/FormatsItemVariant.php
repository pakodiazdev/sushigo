<?php

namespace App\Http\Controllers\Api\V1\Items\Concerns;

use App\Models\ItemVariant;

trait FormatsItemVariant
{
    /**
     * @return array<string, mixed>
     */
    protected function baseVariantData(ItemVariant $variant): array
    {
        return [
            'id' => $variant->public_id,
            'item_id' => $variant->item?->public_id,
            'uom_id' => $variant->unitOfMeasure?->public_id,
            'code' => $variant->code,
            'name' => $variant->name,
            'description' => $variant->description,
            'track_lot' => $variant->track_lot,
            'track_serial' => $variant->track_serial,
            'is_active' => $variant->is_active,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected function variantRelations(ItemVariant $variant): array
    {
        return [
            'uom' => [
                'id' => $variant->unitOfMeasure->public_id,
                'code' => $variant->unitOfMeasure->code,
                'name' => $variant->unitOfMeasure->name,
                'symbol' => $variant->unitOfMeasure->symbol,
            ],
            'item' => [
                'id' => $variant->item->public_id,
                'sku' => $variant->item->sku,
                'name' => $variant->item->name,
                'type' => $variant->item->type,
            ],
        ];
    }
}
