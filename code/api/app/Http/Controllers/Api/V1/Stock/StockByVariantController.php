<?php

namespace App\Http\Controllers\Api\V1\Stock;

use App\Http\Controllers\Controller;
use App\Http\Responses\Common\ResponseEntity;
use App\Models\ItemVariant;
use App\Models\VariantLocationAssignment;
use App\Services\Inventory\AssignmentAwareStockProjection;
use App\Support\Access\OperatingUnitScope;

/**
 * @OA\Get(
 *   path="/api/v1/stock/by-variant/{id}",
 *   summary="Get Existencias summary by Item Variant",
 *   description="Spined on the managed Variant-to-Location assignment (#569), not on Stock (#571): every Location this Variant is assigned to is a row, one with no Stock row projecting zero balances and `stock_id: null`. `summary.total_locations` counts assigned Locations.",
 *   tags={"Stock"},
 *
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="string"), description="Item Variant public_id"),
 *
 *   @OA\Response(response=200, description="Success", @OA\JsonContent(ref="#/components/schemas/ResponseEntity")),
 *   @OA\Response(response=404, description="Item Variant Not Found"),
 * )
 */
class StockByVariantController extends Controller
{
    public function __invoke(string $id, AssignmentAwareStockProjection $projection, OperatingUnitScope $scope)
    {
        $variant = ItemVariant::with(['item'])->where('public_id', $id)->firstOrFail();

        $query = $projection->baseQuery()
            ->where('variant_location_assignments.item_variant_id', $variant->id)
            ->orderBy('variant_location_assignments.inventory_location_id');

        // Horizontal authorization (#440): the per-location breakdown only
        // includes locations in the caller's accessible Operating Units.
        $scope->constrainAssignments($query, request()->user());

        $rows = $query->get();

        $locations = $rows->map(fn (VariantLocationAssignment $row) => [
            'assignment_id' => $row->public_id,
            'inventory_location_id' => $row->inventoryLocation->public_id,
            'location_name' => $row->inventoryLocation->name,
            'location_type' => $row->inventoryLocation->type,
            'operating_unit' => $row->inventoryLocation->operatingUnit->name,
            ...$projection->moneyFields($row),
        ]);

        $totals = $projection->summarize($rows);

        return new ResponseEntity(
            data: [
                'item_variant' => [
                    'id' => $variant->public_id,
                    'code' => $variant->code,
                    'name' => $variant->name,
                    'item_name' => $variant->item->name,
                    'item_sku' => $variant->item->sku,
                ],
                'summary' => [
                    'total_locations' => $totals['assigned_count'],
                    'total_on_hand' => $totals['total_on_hand'],
                    'total_reserved' => $totals['total_reserved'],
                    'total_available' => $totals['total_available'],
                    'low_stock_locations' => $totals['low_stock_count'],
                    'avg_weighted_cost' => $totals['avg_weighted_cost'],
                    'total_inventory_value' => $totals['total_inventory_value'],
                ],
                'locations' => $locations,
            ]
        );
    }
}
