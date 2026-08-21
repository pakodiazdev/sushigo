<?php

namespace App\Http\Controllers\Api\V1\Items;

use App\Http\Controllers\Api\V1\Items\Concerns\FiltersItemListing;
use App\Http\Controllers\Controller;
use App\Http\Requests\Items\ListItemsRequest;
use App\Http\Responses\Common\ResponsePaginated;
use App\Models\Item;

/**
 * @OA\Get(
 *   path="/api/v1/items",
 *   summary="List Items",
 *   tags={"Items"},
 *
 *   @OA\Parameter(name="type", in="query", @OA\Schema(type="string", example="INSUMO,ACTIVO"), description="One type, or a comma-separated list (e.g. the legacy Items grid always passes INSUMO,ACTIVO to exclude Products)"),
 *   @OA\Parameter(name="is_stocked", in="query", @OA\Schema(type="boolean")),
 *   @OA\Parameter(name="is_perishable", in="query", @OA\Schema(type="boolean")),
 *   @OA\Parameter(name="is_active", in="query", @OA\Schema(type="boolean")),
 *   @OA\Parameter(name="search", in="query", @OA\Schema(type="string")),
 *   @OA\Parameter(name="per_page", in="query", @OA\Schema(type="integer", default=15)),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Items retrieved successfully",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *              @OA\Schema(ref="#/components/schemas/ResponsePaginated"),
 *              @OA\Schema(@OA\Property(property="data", type="array", @OA\Items(ref="#/components/schemas/ItemResponse")))
 *           }
 *       )
 *   )
 * )
 */
class ListItemsController extends Controller
{
    use FiltersItemListing;

    public function __invoke(ListItemsRequest $request)
    {
        $query = Item::query();

        if ($request->filled('type')) {
            $types = collect(explode(',', $request->type))
                ->map(fn ($type) => strtoupper(trim($type)))
                ->filter()
                ->all();
            $query->whereIn('type', $types);
        }

        if ($request->filled('is_stocked')) {
            $query->where('is_stocked', $request->boolean('is_stocked'));
        }

        if ($request->filled('is_perishable')) {
            $query->where('is_perishable', $request->boolean('is_perishable'));
        }

        $this->applyIsActiveFilter($query, $request);
        $this->applySearchFilter($query, $request, ['sku', 'name']);

        $items = $query->orderBy('sku')->paginate($this->resolvePerPage($request));

        return new ResponsePaginated(paginator: $items);
    }
}
