<?php

namespace App\Http\Controllers\Api\V1\Items;

use App\Http\Controllers\Controller;
use App\Http\Responses\Common\ResponsePaginated;
use App\Models\ItemVariant;
use Illuminate\Http\Request;

/**
 * @OA\Get(
 *   path="/api/v1/item-variants",
 *   summary="List Item Variants",
 *   tags={"Item Variants"},
 *   @OA\Parameter(name="item_id", in="query", @OA\Schema(type="integer"), description="Filter by item ID"),
 *   @OA\Parameter(name="is_active", in="query", @OA\Schema(type="boolean"), description="Filter by active status"),
 *   @OA\Parameter(name="search", in="query", @OA\Schema(type="string"), description="Search in code and name"),
 *   @OA\Parameter(name="per_page", in="query", @OA\Schema(type="integer", default=15)),
 *   @OA\Response(
 *       response=200,
 *       description="Item variants retrieved successfully",
 *       @OA\JsonContent(
 *           allOf={
 *              @OA\Schema(ref="#/components/schemas/ResponsePaginated"),
 *              @OA\Schema(@OA\Property(property="data", type="array", @OA\Items(ref="#/components/schemas/ItemVariantResponse")))
 *           }
 *       )
 *   )
 * )
 */
class ListItemVariantsController extends Controller
{
    public function __invoke(Request $request)
    {
        $query = ItemVariant::with(['item', 'unitOfMeasure']);

        if ($request->filled('item_id')) {
            $query->where('item_id', $request->item_id);
        }

        if ($request->filled('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('code', 'ILIKE', "%{$search}%")
                    ->orWhere('name', 'ILIKE', "%{$search}%");
            });
        }

        $perPage = $request->input('per_page', 15);
        $variants = $query->orderBy('code')->paginate($perPage);

        return new ResponsePaginated(paginator: $variants);
    }
}
