<?php

namespace App\Http\Controllers\Api\V1\Stock;

use App\Http\Controllers\Controller;
use App\Http\Responses\Common\ResponseEntity;
use App\Models\ItemVariant;
use App\Models\Stock;

/**
 * @OA\Get(
 *   path="/api/v1/stock/by-variant/{id}",
 *   summary="Get Stock Summary by Item Variant",
 *   tags={"Stock"},
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer"), description="Item Variant ID"),
 *   @OA\Response(response=200, description="Success", @OA\JsonContent(ref="#/components/schemas/ResponseEntity")),
 *   @OA\Response(response=404, description="Item Variant Not Found"),
 * )
 */
class StockByVariantController extends Controller
{
    public function __invoke(int $id)
    {
        $variant = ItemVariant::with(['item'])->findOrFail($id);

        $stockRecords = Stock::where('item_variant_id', $id)
            ->with([
                'inventoryLocation.operatingUnit',
            ])
            ->get();

        $locations = $stockRecords->map(function ($stock) {
            return [
                'inventory_location_id' => $stock->inventory_location_id,
                'location_name' => $stock->inventoryLocation->name,
                'location_type' => $stock->inventoryLocation->type,
                'operating_unit' => $stock->inventoryLocation->operatingUnit->name,
                'on_hand' => (float) $stock->on_hand,
                'reserved' => (float) $stock->reserved,
                'available' => (float) $stock->available,
                'weighted_avg_cost' => (float) $stock->weighted_avg_cost,
                'total_value' => (float) ($stock->on_hand * $stock->weighted_avg_cost),
            ];
        });

        $summary = [
            'total_locations' => $stockRecords->count(),
            'total_on_hand' => (float) $stockRecords->sum('on_hand'),
            'total_reserved' => (float) $stockRecords->sum('reserved'),
            'total_available' => (float) $stockRecords->sum('available'),
            'avg_weighted_cost' => (float) $stockRecords->avg('weighted_avg_cost'),
            'total_inventory_value' => (float) $stockRecords->map(fn($s) => $s->on_hand * $s->weighted_avg_cost)->sum(),
        ];

        return new ResponseEntity(
            data: [
                'item_variant' => [
                    'id' => $variant->id,
                    'code' => $variant->code,
                    'name' => $variant->name,
                    'item_name' => $variant->item->name,
                    'item_sku' => $variant->item->sku,
                ],
                'summary' => $summary,
                'locations' => $locations,
            ]
        );
    }
}
