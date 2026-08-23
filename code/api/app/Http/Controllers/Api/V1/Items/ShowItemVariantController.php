<?php

namespace App\Http\Controllers\Api\V1\Items;

use App\Http\Controllers\Api\V1\Items\Concerns\FormatsItemVariant;
use App\Http\Controllers\Controller;
use App\Http\Responses\Common\ResponseEntity;
use App\Models\ItemVariant;

/**
 * @OA\Get(
 *   path="/api/v1/item-variants/{id}",
 *   summary="Get Item Variant by ID",
 *   tags={"Item Variants"},
 *
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Item variant retrieved successfully",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *              @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *              @OA\Schema(@OA\Property(property="data", ref="#/components/schemas/ItemVariantResponse"))
 *           }
 *       )
 *   ),
 *
 *   @OA\Response(response=404, description="Item variant not found", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class ShowItemVariantController extends Controller
{
    use FormatsItemVariant;

    public function __invoke(string $id)
    {
        $variant = ItemVariant::with(['item', 'unitOfMeasure', 'stock.inventoryLocation', 'mediaAttachments.mediaGallery'])
            ->where('public_id', $id)->firstOrFail();

        $totalOnHand = $variant->stock->sum('on_hand');
        $totalReserved = $variant->stock->sum('reserved');

        return new ResponseEntity(
            data: [
                ...$this->baseVariantData($variant),
                'total_on_hand' => (float) $totalOnHand,
                'total_reserved' => (float) $totalReserved,
                'total_available' => (float) ($totalOnHand - $totalReserved),
                ...$this->variantRelations($variant),
                'created_at' => $variant->created_at,
                'updated_at' => $variant->updated_at,
            ]
        );
    }
}
