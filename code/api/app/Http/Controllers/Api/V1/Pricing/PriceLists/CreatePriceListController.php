<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Pricing\PriceLists;

use App\Http\Controllers\Controller;
use App\Http\Requests\Pricing\PriceLists\StorePriceListRequest;
use App\Http\Resources\Pricing\PriceListResource;
use App\Models\PriceList;

/**
 * @OA\Post(
 *   path="/api/v1/pricing/price-lists",
 *   summary="Create Price List",
 *   tags={"Price Lists"},
 *   security={{"passport": {}}},
 *
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/StorePriceListRequest")),
 *
 *   @OA\Response(
 *       response=201,
 *       description="Price List created successfully",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *              @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *              @OA\Schema(@OA\Property(property="data", ref="#/components/schemas/PriceListResponse"))
 *           }
 *       )
 *   ),
 *
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires price_lists.create permission"),
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class CreatePriceListController extends Controller
{
    public function __invoke(StorePriceListRequest $request): PriceListResource
    {
        $priceList = PriceList::create($request->priceListData());

        return (new PriceListResource($priceList))->setStatusCode(201);
    }
}
