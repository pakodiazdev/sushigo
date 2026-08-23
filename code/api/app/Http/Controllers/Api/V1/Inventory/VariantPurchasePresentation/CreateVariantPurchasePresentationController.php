<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\VariantPurchasePresentation;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\VariantPurchasePresentation\StoreVariantPurchasePresentationRequest;
use App\Http\Resources\Inventory\VariantPurchasePresentation\VariantPurchasePresentationResource;
use App\Models\Item;
use App\Models\ItemVariant;
use App\Services\Inventory\VariantPurchasePresentationService;

/**
 * @OA\Post(
 *   path="/api/v1/inventory/products/{id}/variants/{variantId}/purchase-presentations",
 *   summary="Assign a Purchase Presentation Template to a Variant",
 *   description="Rejects a template whose compatible_dimension_uom_id doesn't match the Variant's base UOM — see doc/architecture/product-catalog/product-catalog-architecture.en.md.",
 *   tags={"Variant Purchase Presentations"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
 *   @OA\Parameter(name="variantId", in="path", required=true, @OA\Schema(type="integer")),
 *
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/StoreVariantPurchasePresentationRequest")),
 *
 *   @OA\Response(
 *       response=201,
 *       description="Presentation assigned successfully",
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
 *   @OA\Response(response=403, description="Forbidden — requires items.update permission"),
 *   @OA\Response(response=404, description="Product or Variant not found", @OA\JsonContent(ref="#/components/schemas/ResponseError")),
 *   @OA\Response(response=422, description="Validation Error — incompatible template, inactive template, or duplicate assignment", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class CreateVariantPurchasePresentationController extends Controller
{
    public function __invoke(StoreVariantPurchasePresentationRequest $request, string $id, string $variantId, VariantPurchasePresentationService $service): VariantPurchasePresentationResource
    {
        $product = Item::where('type', Item::TYPE_PRODUCTO)->where('public_id', $id)->firstOrFail();
        $variant = ItemVariant::where('item_id', $product->id)->where('public_id', $variantId)->firstOrFail();
        $presentation = $service->create($variant->id, $request->presentationData());
        $presentation->load('template');

        return (new VariantPurchasePresentationResource($presentation))->setStatusCode(201);
    }
}
