<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Pricing\PriceLists;

use App\Http\Controllers\Controller;
use App\Http\Resources\Pricing\PriceListResource;
use App\Http\Responses\Common\ResponsePaginated;
use App\Models\PriceList;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

/**
 * @OA\Get(
 *   path="/api/v1/pricing/price-lists",
 *   summary="List Price Lists",
 *   tags={"Price Lists"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="is_active", in="query", @OA\Schema(type="boolean")),
 *   @OA\Parameter(name="per_page", in="query", @OA\Schema(type="integer", default=15, minimum=1, maximum=100)),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Price Lists retrieved successfully",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *              @OA\Schema(ref="#/components/schemas/ResponsePaginated"),
 *              @OA\Schema(@OA\Property(property="data", type="array", @OA\Items(ref="#/components/schemas/PriceListResponse")))
 *           }
 *       )
 *   ),
 *
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires price_lists.view permission")
 * )
 */
class ListPriceListsController extends Controller
{
    public function __invoke(Request $request): ResponsePaginated
    {
        Gate::authorize('viewAny', PriceList::class);

        $perPage = $request->validate([
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ])['per_page'] ?? 15;

        $query = PriceList::query()->orderBy('code');

        if ($request->has('is_active')) {
            $query->where('is_active', filter_var($request->input('is_active'), FILTER_VALIDATE_BOOLEAN));
        }

        $priceLists = $query->paginate($perPage);
        $priceLists->getCollection()->transform(fn ($priceList) => (new PriceListResource($priceList))->resolve());

        return new ResponsePaginated(paginator: $priceLists);
    }
}
