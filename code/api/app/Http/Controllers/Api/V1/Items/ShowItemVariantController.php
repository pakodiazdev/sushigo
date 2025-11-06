<?php

namespace App\Http\Controllers\Api\V1\Items;

use App\Http\Controllers\Controller;
use App\Http\Responses\Common\ResponseEntity;
use App\Models\ItemVariant;

/**
 * @OA\Get(
 *   path="/api/v1/item-variants/{id}",
 *   summary="Get Item Variant by ID",
 *   tags={"Item Variants"},
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
 *   @OA\Response(
 *       response=200,
 *       description="Item variant retrieved successfully",
 *       @OA\JsonContent(
 *           allOf={
 *              @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *              @OA\Schema(@OA\Property(property="data", ref="#/components/schemas/ItemVariantResponse"))
 *           }
 *       )
 *   ),
 *   @OA\Response(response=404, description="Item variant not found", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class ShowItemVariantController extends Controller
{
    public function __invoke(int $id)
    {
        $variant = ItemVariant::with(['item', 'unitOfMeasure', 'stock.inventoryLocation', 'mediaAttachments.mediaGallery'])
            ->findOrFail($id);

        $totalOnHand = $variant->stock->sum('on_hand');
        $totalReserved = $variant->stock->sum('reserved');

        return new ResponseEntity(
            data: [
                'id' => $variant->id,
                'item_id' => $variant->item_id,
                'uom_id' => $variant->uom_id,
                'code' => $variant->code,
                'name' => $variant->name,
                'description' => $variant->description,
                'track_lot' => $variant->track_lot,
                'track_serial' => $variant->track_serial,
                'last_unit_cost' => (float) $variant->last_unit_cost,
                'avg_unit_cost' => (float) $variant->avg_unit_cost,
                'sale_price' => $variant->sale_price ? (float) $variant->sale_price : null,
                'min_stock' => (float) $variant->min_stock,
                'max_stock' => (float) $variant->max_stock,
                'is_active' => $variant->is_active,
                'total_on_hand' => (float) $totalOnHand,
                'total_reserved' => (float) $totalReserved,
                'total_available' => (float) ($totalOnHand - $totalReserved),
                'uom' => [
                    'id' => $variant->unitOfMeasure->id,
                    'code' => $variant->unitOfMeasure->code,
                    'name' => $variant->unitOfMeasure->name,
                    'symbol' => $variant->unitOfMeasure->symbol,
                ],
                'item' => [
                    'id' => $variant->item->id,
                    'sku' => $variant->item->sku,
                    'name' => $variant->item->name,
                    'type' => $variant->item->type,
                ],
                'created_at' => $variant->created_at,
                'updated_at' => $variant->updated_at,
            ]
        );
    }
}
