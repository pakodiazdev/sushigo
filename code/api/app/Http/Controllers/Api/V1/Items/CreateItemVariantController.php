<?php

namespace App\Http\Controllers\Api\V1\Items;

use App\Http\Controllers\Api\V1\Items\Concerns\FormatsItemVariant;
use App\Http\Controllers\Controller;
use App\Http\Requests\Items\CreateItemVariantRequest;
use App\Http\Responses\Common\ResponseEntity;
use App\Models\ItemVariant;

/**
 * @OA\Post(
 *   path="/api/v1/item-variants",
 *   summary="Create Item Variant",
 *   tags={"Item Variants"},
 *   security={{"passport": {}}},
 *
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/CreateItemVariantRequest")),
 *
 *   @OA\Response(
 *       response=201,
 *       description="Item variant created successfully",
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
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class CreateItemVariantController extends Controller
{
    use FormatsItemVariant;

    public function __invoke(CreateItemVariantRequest $request)
    {
        $variant = ItemVariant::create([
            'item_id' => $request->item_id,
            'uom_id' => $request->uom_id,
            'code' => $request->code,
            'name' => $request->name,
            'description' => $request->description,
            'track_lot' => $request->input('track_lot', false),
            'track_serial' => $request->input('track_serial', false),
            'last_unit_cost' => 0,
            'avg_unit_cost' => 0,
            'sale_price' => $request->sale_price,
            'is_active' => $request->input('is_active', true),
            'meta' => [],
        ]);

        $variant->load(['item', 'unitOfMeasure']);

        return new ResponseEntity(
            data: [
                ...$this->baseVariantData($variant),
                ...$this->variantRelations($variant),
                'created_at' => $variant->created_at,
                'updated_at' => $variant->updated_at,
            ],
            status: 201
        );
    }
}
