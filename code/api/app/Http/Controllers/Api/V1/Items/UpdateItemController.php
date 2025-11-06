<?php

namespace App\Http\Controllers\Api\V1\Items;

use App\Http\Controllers\Controller;
use App\Http\Requests\Items\UpdateItemRequest;
use App\Http\Responses\Common\ResponseEntity;
use App\Models\Item;

/**
 * @OA\Put(
 *   path="/api/v1/items/{id}",
 *   summary="Update Item",
 *   tags={"Items"},
 *   security={{"passport": {}}},
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/UpdateItemRequest")),
 *   @OA\Response(
 *       response=200,
 *       description="Item updated successfully",
 *       @OA\JsonContent(
 *           allOf={
 *              @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *              @OA\Schema(@OA\Property(property="data", ref="#/components/schemas/ItemResponse"))
 *           }
 *       )
 *   ),
 *   @OA\Response(response=404, description="Item not found", @OA\JsonContent(ref="#/components/schemas/ResponseError")),
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class UpdateItemController extends Controller
{
    public function __invoke(UpdateItemRequest $request, int $id)
    {
        $item = Item::findOrFail($id);
        $item->update($request->validated());

        return new ResponseEntity(
            data: [
                'id' => $item->id,
                'sku' => $item->sku,
                'name' => $item->name,
                'description' => $item->description,
                'type' => $item->type,
                'is_stocked' => $item->is_stocked,
                'is_perishable' => $item->is_perishable,
                'is_active' => $item->is_active,
                'created_at' => $item->created_at,
                'updated_at' => $item->updated_at,
            ]
        );
    }
}
