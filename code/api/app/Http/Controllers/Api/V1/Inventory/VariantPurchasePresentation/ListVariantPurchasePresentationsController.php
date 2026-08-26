<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\VariantPurchasePresentation;

use App\Http\Controllers\Controller;
use App\Http\Resources\Inventory\VariantPurchasePresentation\VariantPurchasePresentationResource;
use App\Models\Item;
use App\Models\ItemVariant;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * @OA\Get(
 *   path="/api/v1/inventory/products/{id}/variants/{variantId}/purchase-presentations",
 *   summary="List Variant Purchase Presentations",
 *   description="Always Variant-scoped — a variant not belonging to the given Product resolves as not found.",
 *   tags={"Variant Purchase Presentations"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
 *   @OA\Parameter(name="variantId", in="path", required=true, @OA\Schema(type="integer")),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Presentations retrieved successfully",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *              @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *              @OA\Schema(@OA\Property(property="data", type="array", @OA\Items(ref="#/components/schemas/VariantPurchasePresentationResponse")))
 *           }
 *       )
 *   ),
 *
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires items.view, suppliers.manage, or receipts.manage permission"),
 *   @OA\Response(response=404, description="Product or Variant not found", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class ListVariantPurchasePresentationsController extends Controller
{
    public function __invoke(string $id, string $variantId): AnonymousResourceCollection
    {
        $product = Item::where('type', Item::TYPE_PRODUCTO)->where('public_id', $id)->firstOrFail();
        $variant = ItemVariant::where('item_id', $product->id)->where('public_id', $variantId)->firstOrFail();

        $presentations = $variant->purchasePresentations()
            ->with('template')
            ->orderByDesc('is_default')
            ->orderBy('id')
            ->get();

        return VariantPurchasePresentationResource::collection($presentations);
    }
}
