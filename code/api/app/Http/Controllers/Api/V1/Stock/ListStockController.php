<?php

namespace App\Http\Controllers\Api\V1\Stock;

use App\Http\Controllers\Controller;
use App\Http\Requests\Stock\ListStockRequest;
use App\Http\Responses\Common\ResponsePaginated;
use App\Models\Stock;
use App\Services\Inventory\ReplenishmentPolicyResolver;

/**
 * @OA\Get(
 *   path="/api/v1/stock",
 *   summary="List Stock Records",
 *   tags={"Stock"},
 *
 *   @OA\Parameter(name="inventory_location_id", in="query", required=false, @OA\Schema(type="string")),
 *   @OA\Parameter(name="item_variant_id", in="query", required=false, @OA\Schema(type="string")),
 *   @OA\Parameter(name="min_on_hand", in="query", required=false, @OA\Schema(type="number")),
 *   @OA\Parameter(name="low_stock", in="query", required=false, @OA\Schema(type="boolean"), description="Only rows at or below their resolved per-location replenishment reorder point"),
 *   @OA\Parameter(name="per_page", in="query", required=false, @OA\Schema(type="integer")),
 *
 *   @OA\Response(response=200, description="Success", @OA\JsonContent(ref="#/components/schemas/ResponsePaginated")),
 * )
 */
class ListStockController extends Controller
{
    public function __invoke(ListStockRequest $request, ReplenishmentPolicyResolver $resolver)
    {
        $query = Stock::query()
            ->with([
                'inventoryLocation.operatingUnit',
                'itemVariant.item',
            ]);

        // Filter by inventory location
        if ($request->filled('inventory_location_id')) {
            $query->whereHas('inventoryLocation', fn ($locationQuery) => $locationQuery
                ->where('public_id', $request->string('inventory_location_id')));
        }

        // Filter by item variant
        if ($request->filled('item_variant_id')) {
            $query->whereHas('itemVariant', fn ($variantQuery) => $variantQuery
                ->where('public_id', $request->string('item_variant_id')));
        }

        // Filter by minimum on_hand
        if ($request->filled('min_on_hand')) {
            $query->where('on_hand', '>=', $request->min_on_hand);
        }

        // Filter to rows that are low against their resolved per-location policy (#439)
        if ($request->boolean('low_stock')) {
            $query->lowStock();
        }

        // Order by location, then by item variant
        $query->orderBy('inventory_location_id')
            ->orderBy('item_variant_id');

        $perPage = $request->input('per_page', 15);
        $stock = $query->paginate($perPage);

        // Attach the resolved per-location replenishment policy (#439) to each
        // row so a client can render low-stock state without a second call.
        $policies = $resolver->resolveByPairs($stock->getCollection());
        $stock->through(function (Stock $row) use ($policies) {
            $policy = $policies->get($row->inventory_location_id.':'.$row->item_variant_id);
            $row->setAttribute('min_stock', $policy ? (float) $policy->min_stock : null);
            $row->setAttribute('max_stock', $policy ? (float) $policy->max_stock : null);
            $row->setAttribute('is_low_stock', $policy !== null && (float) $row->on_hand <= (float) $policy->min_stock);

            return $row;
        });

        return new ResponsePaginated($stock);
    }
}
