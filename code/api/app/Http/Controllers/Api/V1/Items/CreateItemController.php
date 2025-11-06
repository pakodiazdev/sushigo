<?php

namespace App\Http\Controllers\Api\V1\Items;

use App\Http\Controllers\Controller;
use App\Http\Requests\Items\CreateItemRequest;
use App\Http\Responses\Common\ResponseEntity;
use App\Models\Item;

/**
 * @OA\Post(
 *   path="/api/v1/items",
 *   summary="Create Item",
 *   tags={"Items"},
 *   security={{"passport": {}}},
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/CreateItemRequest")),
 *   @OA\Response(
 *       response=201,
 *       description="Item created successfully",
 *       @OA\JsonContent(
 *           allOf={
 *              @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *              @OA\Schema(@OA\Property(property="data", ref="#/components/schemas/ItemResponse"))
 *           }
 *       )
 *   ),
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class CreateItemController extends Controller
{
    public function __invoke(CreateItemRequest $request)
    {
        $item = Item::create([
            'sku' => $request->sku,
            'name' => $request->name,
            'description' => $request->description,
            'type' => $request->type,
            'is_stocked' => $request->input('is_stocked', true),
            'is_perishable' => $request->input('is_perishable', false),
            'is_manufactured' => $request->input('is_manufactured', true),
            'is_active' => $request->input('is_active', true),
            'meta' => [],
        ]);

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
                'created_at' => $item->created_at,
                'updated_at' => $item->updated_at,
            ],
            status: 201
        );
    }
}
