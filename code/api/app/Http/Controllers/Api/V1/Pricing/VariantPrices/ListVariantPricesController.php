<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Pricing\VariantPrices;

use App\Http\Controllers\Controller;
use App\Http\Resources\Pricing\VariantPriceResource;
use App\Http\Responses\Common\ResponsePaginated;
use App\Models\PriceList;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

/**
 * @OA\Get(
 *   path="/api/v1/pricing/price-lists/{priceList}/variant-prices",
 *   summary="List Variant Prices for a Price List",
 *   tags={"Variant Prices"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="priceList", in="path", required=true, @OA\Schema(type="string")),
 *   @OA\Parameter(name="per_page", in="query", @OA\Schema(type="integer", default=15, minimum=1, maximum=100)),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Variant Prices retrieved successfully",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *              @OA\Schema(ref="#/components/schemas/ResponsePaginated"),
 *              @OA\Schema(@OA\Property(property="data", type="array", @OA\Items(ref="#/components/schemas/VariantPriceResponse")))
 *           }
 *       )
 *   ),
 *
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires price_lists.view permission"),
 *   @OA\Response(response=404, description="Price List not found", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class ListVariantPricesController extends Controller
{
    public function __invoke(Request $request, PriceList $priceList): ResponsePaginated
    {
        Gate::authorize('view', $priceList);

        $perPage = $request->validate([
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ])['per_page'] ?? 15;

        $prices = $priceList->variantPrices()
            ->with('itemVariant')
            ->orderByDesc('id')
            ->paginate($perPage);

        $prices->getCollection()->transform(
            fn ($price) => (new VariantPriceResource($price->setRelation('priceList', $priceList)))->resolve()
        );

        return new ResponsePaginated(paginator: $prices);
    }
}
