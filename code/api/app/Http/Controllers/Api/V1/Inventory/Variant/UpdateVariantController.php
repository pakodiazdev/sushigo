<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\Variant;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\Variant\UpdateVariantRequest;
use App\Http\Resources\Inventory\Variant\VariantResource;
use App\Models\Item;
use App\Models\ItemVariant;

/**
 * @OA\Put(
 *   path="/api/v1/inventory/products/{id}/variants/{variantId}",
 *   summary="Update Product Variant",
 *   description="Catalog identity only — never accepts acquisition cost, sale price, or stock thresholds/balances.",
 *   tags={"Product Variants"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
 *   @OA\Parameter(name="variantId", in="path", required=true, @OA\Schema(type="integer")),
 *
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/UpdateVariantRequest")),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Variant updated successfully",
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
 *   @OA\Response(response=403, description="Forbidden — requires items.update permission"),
 *   @OA\Response(response=404, description="Product or Variant not found", @OA\JsonContent(ref="#/components/schemas/ResponseError")),
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class UpdateVariantController extends Controller
{
    public function __invoke(UpdateVariantRequest $request, string $id, string $variantId): VariantResource
    {
        $product = Item::where('type', Item::TYPE_PRODUCTO)->where('public_id', $id)->firstOrFail();
        $variant = ItemVariant::where('item_id', $product->id)->where('public_id', $variantId)->firstOrFail();

        $variant->update($request->variantData());
        $variant->load('unitOfMeasure');

        return new VariantResource($variant);
    }
}
