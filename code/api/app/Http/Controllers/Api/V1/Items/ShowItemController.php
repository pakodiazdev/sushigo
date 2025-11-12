<?php

namespace App\Http\Controllers\Api\V1\Items;

use App\Http\Controllers\Controller;
use App\Http\Responses\Common\ResponseEntity;
use App\Models\Item;

/**
 * @OA\Get(
 *   path="/api/v1/items/{id}",
 *   summary="Get Item by ID",
 *   tags={"Items"},
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
 *   @OA\Response(
 *       response=200,
 *       description="Item retrieved successfully",
 *       @OA\JsonContent(
 *           allOf={
 *              @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *              @OA\Schema(@OA\Property(property="data", ref="#/components/schemas/ItemResponse"))
 *           }
 *       )
 *   ),
 *   @OA\Response(response=404, description="Item not found", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class ShowItemController extends Controller
{
    public function __invoke(int $id)
    {
        $item = Item::with(['variants', 'mediaAttachments.mediaGallery'])->findOrFail($id);

        return new ResponseEntity(
            data: [
                'id' => $item->id,
                'sku' => $item->sku,
                'name' => $item->name,
                'description' => $item->description,
                'type' => $item->type,
                'is_stocked' => $item->is_stocked,
                'is_perishable' => $item->is_perishable,
                'is_manufactured' => $item->is_manufactured,
                'is_active' => $item->is_active,
                'variants_count' => $item->variants->count(),
                'created_at' => $item->created_at,
                'updated_at' => $item->updated_at,
            ]
        );
    }
}
