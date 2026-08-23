<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\Variant;

use App\Http\Controllers\Controller;
use App\Http\Resources\Inventory\Variant\VariantResource;
use App\Models\Item;
use App\Models\ItemVariant;

/**
 * @OA\Get(
 *   path="/api/v1/inventory/products/{id}/variants/{variantId}",
 *   summary="Get Product Variant by ID",
 *   description="Always Product-scoped — a variant not belonging to the given Product resolves as not found.",
 *   tags={"Product Variants"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
 *   @OA\Parameter(name="variantId", in="path", required=true, @OA\Schema(type="integer")),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Variant retrieved successfully",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *              @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *              @OA\Schema(@OA\Property(property="data", ref="#/components/schemas/VariantResponse"))
 *           }
 *       )
 *   ),
 *
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires items.view permission"),
 *   @OA\Response(response=404, description="Product or Variant not found", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class ShowVariantController extends Controller
{
    public function __invoke(string $id, string $variantId): VariantResource
    {
        $product = Item::where('type', Item::TYPE_PRODUCTO)->where('public_id', $id)->firstOrFail();

        $variant = ItemVariant::where('item_id', $product->id)
            ->with('unitOfMeasure')
            ->where('public_id', $variantId)
            ->firstOrFail();

        return new VariantResource($variant);
    }
}
