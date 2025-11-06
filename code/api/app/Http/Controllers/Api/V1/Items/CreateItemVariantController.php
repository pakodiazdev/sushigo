<?php

namespace App\Http\Controllers\Api\V1\Items;

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
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/CreateItemVariantRequest")),
 *   @OA\Response(
 *       response=201,
 *       description="Item variant created successfully",
 *       @OA\JsonContent(
 *           allOf={
 *              @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *              @OA\Schema(@OA\Property(property="data", ref="#/components/schemas/ItemVariantResponse"))
 *           }
 *       )
 *   ),
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class CreateItemVariantController extends Controller
{
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
            'min_stock' => $request->input('min_stock', 0),
            'max_stock' => $request->input('max_stock', 0),
            'is_active' => $request->input('is_active', true),
            'meta' => [],
        ]);

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
            ],
            status: 201
        );
    }
}
