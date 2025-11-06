<?php

namespace App\Http\Controllers\Api\V1\Items;

use App\Http\Controllers\Controller;
use App\Http\Requests\Items\UpdateItemVariantRequest;
use App\Http\Responses\Common\ResponseEntity;
use App\Models\ItemVariant;

/**
 * @OA\Put(
 *   path="/api/v1/item-variants/{id}",
 *   summary="Update Item Variant",
 *   tags={"Item Variants"},
 *   security={{"passport": {}}},
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/UpdateItemVariantRequest")),
 *   @OA\Response(
 *       response=200,
 *       description="Item variant updated successfully",
 *       @OA\JsonContent(
 *           allOf={
 *              @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *              @OA\Schema(@OA\Property(property="data", ref="#/components/schemas/ItemVariantResponse"))
 *           }
 *       )
 *   ),
 *   @OA\Response(response=404, description="Item variant not found", @OA\JsonContent(ref="#/components/schemas/ResponseError")),
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class UpdateItemVariantController extends Controller
{
    public function __invoke(UpdateItemVariantRequest $request, int $id)
    {
        $variant = ItemVariant::findOrFail($id);
        $variant->update($request->validated());
        $variant->load(['item', 'unitOfMeasure']);

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
                'created_at' => $variant->created_at,
                'updated_at' => $variant->updated_at,
            ]
        );
    }
}
