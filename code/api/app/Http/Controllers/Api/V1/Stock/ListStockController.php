<?php

namespace App\Http\Controllers\Api\V1\Stock;

use App\Http\Controllers\Controller;
use App\Http\Requests\Stock\ListStockRequest;
use App\Http\Responses\Common\ResponsePaginated;
use App\Models\VariantLocationAssignment;
use App\Services\Inventory\AssignmentAwareStockProjection;
use App\Support\Access\OperatingUnitScope;

/**
 * @OA\Get(
 *   path="/api/v1/stock",
 *   summary="List Existencias rows (managed assortment + optional physical Stock)",
 *   description="Spined on the managed Variant-to-Location assignment (#569), not on Stock (#571). Every live assigned pair is returned; one with no Stock row yet projects zero on-hand/reserved/available/cost/value and `stock_id: null`. `id` is the assignment public_id (stable row identity); `stock_id` is the nullable physical identity.",
 *   tags={"Stock"},
 *
 *   @OA\Parameter(name="inventory_location_id", in="query", required=false, @OA\Schema(type="string")),
 *   @OA\Parameter(name="item_variant_id", in="query", required=false, @OA\Schema(type="string")),
 *   @OA\Parameter(name="min_on_hand", in="query", required=false, @OA\Schema(type="number"), description="Matched against the projected on-hand; 0 keeps projected zero rows, any positive value drops them"),
 *   @OA\Parameter(name="low_stock", in="query", required=false, @OA\Schema(type="boolean"), description="Only rows at or below their resolved per-location replenishment reorder point (#439); projected zero rows qualify when a live policy exists with a non-negative min_stock"),
 *   @OA\Parameter(name="per_page", in="query", required=false, @OA\Schema(type="integer")),
 *
 *   @OA\Response(response=200, description="Success", @OA\JsonContent(ref="#/components/schemas/ResponsePaginated")),
 * )
 */
class ListStockController extends Controller
{
    public function __invoke(
        ListStockRequest $request,
        AssignmentAwareStockProjection $projection,
        OperatingUnitScope $scope
    ) {
        $query = $projection->baseQuery();

        // Horizontal authorization (#440): restrict to assignments in the
        // caller's accessible Operating Units before any request filter, so an
        // `inventory_location_id` filter cannot reach another unit's assortment.
        $scope->constrainAssignments($query, $request->user());

        if ($request->filled('inventory_location_id')) {
            $query->whereHas('inventoryLocation', fn ($locationQuery) => $locationQuery
                ->where('public_id', $request->string('inventory_location_id')));
        }

        if ($request->filled('item_variant_id')) {
            $query->whereHas('itemVariant', fn ($variantQuery) => $variantQuery
                ->where('public_id', $request->string('item_variant_id')));
        }

        if ($request->filled('min_on_hand')) {
            $projection->filterMinOnHand($query, (float) $request->input('min_on_hand'));
        }

        if ($request->boolean('low_stock')) {
            $projection->filterLowStock($query);
        }

        $query->orderBy('variant_location_assignments.inventory_location_id')
            ->orderBy('variant_location_assignments.item_variant_id');

        $rows = $query->paginate($request->input('per_page', 15));

        $rows->through(fn (VariantLocationAssignment $row) => $projection->projectRow($row));

        return new ResponsePaginated($rows);
    }
}
