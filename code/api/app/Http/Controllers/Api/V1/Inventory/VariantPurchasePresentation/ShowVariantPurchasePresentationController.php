<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\VariantPurchasePresentation;

use App\Http\Controllers\Controller;
use App\Http\Resources\Inventory\VariantPurchasePresentation\VariantPurchasePresentationResource;
use App\Models\Item;
use App\Models\ItemVariant;
use App\Models\VariantPurchasePresentation;

/**
 * @OA\Get(
 *   path="/api/v1/inventory/products/{id}/variants/{variantId}/purchase-presentations/{presentationId}",
 *   summary="Get Variant Purchase Presentation by ID",
 *   tags={"Variant Purchase Presentations"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
 *   @OA\Parameter(name="variantId", in="path", required=true, @OA\Schema(type="integer")),
 *   @OA\Parameter(name="presentationId", in="path", required=true, @OA\Schema(type="string"), description="Assignment public_id (ULID)"),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Presentation retrieved successfully",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *              @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *              @OA\Schema(@OA\Property(property="data", ref="#/components/schemas/VariantPurchasePresentationResponse"))
 *           }
 *       )
 *   ),
 *
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires items.view permission"),
 *   @OA\Response(response=404, description="Product, Variant or Presentation not found", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class ShowVariantPurchasePresentationController extends Controller
{
    public function __invoke(string $id, string $variantId, string $presentationId): VariantPurchasePresentationResource
    {
        $product = Item::where('type', Item::TYPE_PRODUCTO)->where('public_id', $id)->firstOrFail();
        $variant = ItemVariant::where('item_id', $product->id)->where('public_id', $variantId)->firstOrFail();

        $presentation = VariantPurchasePresentation::where('item_variant_id', $variant->id)
            ->where('public_id', $presentationId)
            ->with('template')
            ->firstOrFail();

        return new VariantPurchasePresentationResource($presentation);
    }
}
