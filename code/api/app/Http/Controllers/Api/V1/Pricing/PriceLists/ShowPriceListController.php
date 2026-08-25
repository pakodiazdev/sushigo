<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Pricing\PriceLists;

use App\Http\Controllers\Controller;
use App\Http\Resources\Pricing\PriceListResource;
use App\Models\PriceList;
use Illuminate\Support\Facades\Gate;

/**
 * @OA\Get(
 *   path="/api/v1/pricing/price-lists/{priceList}",
 *   summary="Show Price List",
 *   tags={"Price Lists"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="priceList", in="path", required=true, @OA\Schema(type="string")),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Price List retrieved successfully",
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
 *   @OA\Response(response=403, description="Forbidden — requires price_lists.view permission"),
 *   @OA\Response(response=404, description="Price List not found", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class ShowPriceListController extends Controller
{
    public function __invoke(PriceList $priceList): PriceListResource
    {
        Gate::authorize('view', $priceList);

        return new PriceListResource($priceList);
    }
}
