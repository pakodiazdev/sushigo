<?php

namespace App\Http\Controllers\Api\V1\Stock;

use App\Http\Controllers\Controller;
use App\Http\Responses\Common\ResponseEntity;
use App\Models\InventoryLocation;
use App\Models\VariantLocationAssignment;
use App\Services\Inventory\AssignmentAwareStockProjection;
use App\Support\Access\OperatingUnitScope;

/**
 * @OA\Get(
 *   path="/api/v1/stock/by-location/{id}",
 *   summary="Get Existencias summary by Location",
 *   description="Spined on the managed Variant-to-Location assignment (#569), not on Stock (#571): every live assigned Variant is an item, one with no Stock row projecting zero balances and `stock_id: null`. `summary.total_variants` counts assigned Variants.",
 *   tags={"Stock"},
 *
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="string"), description="Inventory Location public_id"),
 *
 *   @OA\Response(response=200, description="Success", @OA\JsonContent(ref="#/components/schemas/ResponseEntity")),
 *   @OA\Response(response=403, description="Forbidden — caller is not an active member of the location's Operating Unit"),
 *   @OA\Response(response=404, description="Location Not Found"),
 * )
 */
class StockByLocationController extends Controller
{
    public function __invoke(string $id, AssignmentAwareStockProjection $projection, OperatingUnitScope $scope)
    {
        $location = InventoryLocation::findByPublicIdOrFail($id);

        // A Location whose Operating Unit was soft-deleted (DeleteOperatingUnit
        // controller has no cascade) has no operational context to summarize —
        // treat it as not found rather than dereferencing a null relation below.
        abort_if($location->operatingUnit === null, 404);

        // Horizontal authorization (#440): stock.view alone is not enough to
        // read a specific location's assortment — the caller must belong to its
        // Operating Unit.
        $scope->assertCanAccessLocation(request()->user(), $location);

        $rows = $projection->baseQuery()
            ->where('variant_location_assignments.inventory_location_id', $location->id)
            ->orderBy('variant_location_assignments.item_variant_id')
            ->get();

        $items = $rows->map(fn (VariantLocationAssignment $row) => [
            'assignment_id' => $row->public_id,
            ...$projection->variantFields($row),
            ...$projection->moneyFields($row),
        ]);

        $totals = $projection->summarize($rows);

        return new ResponseEntity(
            data: [
                'inventory_location' => [
                    'id' => $location->public_id,
                    'name' => $location->name,
                    'type' => $location->type,
                    'priority' => $location->priority,
                    'operating_unit' => $location->operatingUnit->name,
                ],
                'summary' => [
                    'total_variants' => $totals['assigned_count'],
                    'total_on_hand' => $totals['total_on_hand'],
                    'total_reserved' => $totals['total_reserved'],
                    'total_available' => $totals['total_available'],
                    'low_stock_variants' => $totals['low_stock_count'],
                    'total_inventory_value' => $totals['total_inventory_value'],
                ],
                'items' => $items,
            ]
        );
    }
}
