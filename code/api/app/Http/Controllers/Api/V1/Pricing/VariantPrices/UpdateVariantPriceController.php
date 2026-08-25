<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Pricing\VariantPrices;

use App\Http\Controllers\Controller;
use App\Http\Requests\Pricing\VariantPrices\UpdateVariantPriceRequest;
use App\Http\Resources\Pricing\VariantPriceResource;
use App\Models\PriceList;
use App\Services\Pricing\VariantPriceService;

/**
 * @OA\Put(
 *   path="/api/v1/pricing/price-lists/{priceList}/variant-prices/{variantPrice}",
 *   summary="Update Variant Price",
 *   tags={"Variant Prices"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="priceList", in="path", required=true, @OA\Schema(type="string")),
 *   @OA\Parameter(name="variantPrice", in="path", required=true, @OA\Schema(type="string")),
 *
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/UpdateVariantPriceRequest")),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Variant Price updated successfully",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *              @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *              @OA\Schema(@OA\Property(property="data", ref="#/components/schemas/VariantPriceResponse"))
 *           }
 *       )
 *   ),
 *
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires price_lists.update permission"),
 *   @OA\Response(response=404, description="Price List or Variant Price not found", @OA\JsonContent(ref="#/components/schemas/ResponseError")),
 *   @OA\Response(response=422, description="Validation Error — including overlap conflicts", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class UpdateVariantPriceController extends Controller
{
    public function __invoke(UpdateVariantPriceRequest $request, PriceList $priceList, string $variantPrice, VariantPriceService $service): VariantPriceResource
    {
        $model = $priceList->variantPrices()->where('public_id', $variantPrice)->firstOrFail();

        $updated = $service->update($model, $request->variantPriceData());
        $updated->setRelation('priceList', $priceList);

        return new VariantPriceResource($updated->load('itemVariant'));
    }
}
