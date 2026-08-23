<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\VariantPurchasePresentation;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\VariantPurchasePresentation\UpdateVariantPurchasePresentationRequest;
use App\Http\Resources\Inventory\VariantPurchasePresentation\VariantPurchasePresentationResource;
use App\Models\Item;
use App\Models\ItemVariant;
use App\Models\VariantPurchasePresentation;
use App\Services\Inventory\VariantPurchasePresentationService;

/**
 * @OA\Put(
 *   path="/api/v1/inventory/products/{id}/variants/{variantId}/purchase-presentations/{presentationId}",
 *   summary="Update a Variant Purchase Presentation",
 *   description="template_id is immutable — reassign by deleting and creating a new assignment instead.",
 *   tags={"Variant Purchase Presentations"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
 *   @OA\Parameter(name="variantId", in="path", required=true, @OA\Schema(type="integer")),
 *   @OA\Parameter(name="presentationId", in="path", required=true, @OA\Schema(type="string"), description="Assignment public_id (ULID)"),
 *
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/UpdateVariantPurchasePresentationRequest")),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Presentation updated successfully",
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
 *   @OA\Response(response=404, description="Product, Variant or Presentation not found", @OA\JsonContent(ref="#/components/schemas/ResponseError")),
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class UpdateVariantPurchasePresentationController extends Controller
{
    public function __invoke(UpdateVariantPurchasePresentationRequest $request, string $id, string $variantId, string $presentationId, VariantPurchasePresentationService $service): VariantPurchasePresentationResource
    {
        $product = Item::where('type', Item::TYPE_PRODUCTO)->where('public_id', $id)->firstOrFail();
        $variant = ItemVariant::where('item_id', $product->id)->where('public_id', $variantId)->firstOrFail();

        $presentation = VariantPurchasePresentation::where('item_variant_id', $variant->id)
            ->where('public_id', $presentationId)
            ->firstOrFail();

        $presentation = $service->update($presentation, $request->presentationData());
        $presentation->load('template');

        return new VariantPurchasePresentationResource($presentation);
    }
}
