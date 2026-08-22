<?php

namespace App\Http\Controllers\Api\V1\Items;

use App\Http\Controllers\Api\V1\Items\Concerns\FiltersItemListing;
use App\Http\Controllers\Controller;
use App\Http\Responses\Common\ResponsePaginated;
use App\Models\ItemVariant;
use Illuminate\Http\Request;

/**
 * @OA\Get(
 *   path="/api/v1/item-variants",
 *   summary="List Item Variants",
 *   tags={"Item Variants"},
 *
 *   @OA\Parameter(name="item_id", in="query", @OA\Schema(type="integer"), description="Filter by item ID"),
 *   @OA\Parameter(name="item_type", in="query", @OA\Schema(type="string", example="INSUMO,ACTIVO"), description="Filter by parent item type — one type, or a comma-separated list (e.g. the legacy Variants grid always passes INSUMO,ACTIVO to exclude Product variants)"),
 *   @OA\Parameter(name="is_active", in="query", @OA\Schema(type="boolean"), description="Filter by active status"),
 *   @OA\Parameter(name="search", in="query", @OA\Schema(type="string"), description="Search in code and name"),
 *   @OA\Parameter(name="per_page", in="query", @OA\Schema(type="integer", default=15)),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Item variants retrieved successfully",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *              @OA\Schema(ref="#/components/schemas/ResponsePaginated"),
 *              @OA\Schema(@OA\Property(property="data", type="array", @OA\Items(ref="#/components/schemas/ItemVariantResponse")))
 *           }
 *       )
 *   )
 * )
 */
class ListItemVariantsController extends Controller
{
    use FiltersItemListing;

    public function __invoke(Request $request)
    {
        $query = ItemVariant::with(['item', 'unitOfMeasure']);

        if ($request->filled('item_id')) {
            $query->where('item_id', $request->item_id);
        }

        if ($request->filled('item_type')) {
            // Guards against e.g. item_type[]=INSUMO resolving to an array — explode() on a
            // non-string throws a TypeError (500) instead of the intended 422.
            $validated = $request->validate(['item_type' => ['string']]);
            $types = collect(explode(',', $validated['item_type']))
                ->map(fn ($type) => strtoupper(trim($type)))
                ->filter()
                ->all();
            $query->whereHas('item', fn ($itemQuery) => $itemQuery->whereIn('type', $types));
        }

        $this->applyIsActiveFilter($query, $request);
        $this->applySearchFilter($query, $request, ['code', 'name']);

        $variants = $query->orderBy('code')->paginate($this->resolvePerPage($request));

        return new ResponsePaginated(paginator: $variants);
    }
}
