<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Pricing\VariantPrices;

use App\Http\Controllers\Controller;
use App\Http\Requests\Pricing\VariantPrices\StoreVariantPriceRequest;
use App\Http\Resources\Pricing\VariantPriceResource;
use App\Models\PriceList;
use App\Services\Pricing\VariantPriceService;

/**
 * @OA\Post(
 *   path="/api/v1/pricing/price-lists/{priceList}/variant-prices",
 *   summary="Create Variant Price",
 *   description="Prices exact monetary storage — the same Variant can never have two overlapping active prices within the same Price List.",
 *   tags={"Variant Prices"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="priceList", in="path", required=true, @OA\Schema(type="string")),
 *
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/StoreVariantPriceRequest")),
 *
 *   @OA\Response(
 *       response=201,
 *       description="Variant Price created successfully",
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
 *   @OA\Response(response=404, description="Price List not found", @OA\JsonContent(ref="#/components/schemas/ResponseError")),
 *   @OA\Response(response=422, description="Validation Error — including overlap conflicts", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class CreateVariantPriceController extends Controller
{
    public function __invoke(StoreVariantPriceRequest $request, PriceList $priceList, VariantPriceService $service): VariantPriceResource
    {
        $price = $service->create($priceList->id, $request->variantPriceData());
        $price->setRelation('priceList', $priceList);

        return (new VariantPriceResource($price->load('itemVariant')))->setStatusCode(201);
    }
}
