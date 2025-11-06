<?php

namespace App\Http\Controllers\Api\V1\Stock;

use App\Http\Controllers\Controller;
use App\Http\Requests\Stock\ListStockRequest;
use App\Http\Responses\Common\ResponsePaginated;
use App\Models\Stock;

/**
 * @OA\Get(
 *   path="/api/v1/stock",
 *   summary="List Stock Records",
 *   tags={"Stock"},
 *   @OA\Parameter(name="inventory_location_id", in="query", required=false, @OA\Schema(type="integer")),
 *   @OA\Parameter(name="item_variant_id", in="query", required=false, @OA\Schema(type="integer")),
 *   @OA\Parameter(name="min_on_hand", in="query", required=false, @OA\Schema(type="number")),
 *   @OA\Parameter(name="per_page", in="query", required=false, @OA\Schema(type="integer")),
 *   @OA\Response(response=200, description="Success", @OA\JsonContent(ref="#/components/schemas/ResponsePaginated")),
 * )
 */
class ListStockController extends Controller
{
    public function __invoke(ListStockRequest $request)
    {
        $query = Stock::query()
            ->with([
                'inventoryLocation.operatingUnit',
                'itemVariant.item',
            ]);

        // Filter by inventory location
        if ($request->filled('inventory_location_id')) {
            $query->where('inventory_location_id', $request->inventory_location_id);
        }

        // Filter by item variant
        if ($request->filled('item_variant_id')) {
            $query->where('item_variant_id', $request->item_variant_id);
        }

        // Filter by minimum on_hand
        if ($request->filled('min_on_hand')) {
            $query->where('on_hand', '>=', $request->min_on_hand);
        }

        // Order by location, then by item variant
        $query->orderBy('inventory_location_id')
            ->orderBy('item_variant_id');

        $perPage = $request->input('per_page', 15);
        $stock = $query->paginate($perPage);

        return new ResponsePaginated($stock);
    }
}
