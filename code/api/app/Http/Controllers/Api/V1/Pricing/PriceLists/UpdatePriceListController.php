<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Pricing\PriceLists;

use App\Http\Controllers\Controller;
use App\Http\Requests\Pricing\PriceLists\UpdatePriceListRequest;
use App\Http\Resources\Pricing\PriceListResource;
use App\Models\PriceList;
use App\Services\Pricing\PriceListService;

/**
 * @OA\Put(
 *   path="/api/v1/pricing/price-lists/{priceList}",
 *   summary="Update Price List",
 *   tags={"Price Lists"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="priceList", in="path", required=true, @OA\Schema(type="string")),
 *
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/UpdatePriceListRequest")),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Price List updated successfully",
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
 *   @OA\Response(response=403, description="Forbidden — requires price_lists.update permission"),
 *   @OA\Response(response=404, description="Price List not found", @OA\JsonContent(ref="#/components/schemas/ResponseError")),
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class UpdatePriceListController extends Controller
{
    public function __invoke(UpdatePriceListRequest $request, PriceList $priceList, PriceListService $service): PriceListResource
    {
        $updated = $service->update($priceList, $request->priceListData());

        return new PriceListResource($updated);
    }
}
