<?php

namespace App\Http\Controllers\Api\V1\Stock;

use App\Http\Controllers\Controller;
use App\Http\Responses\Common\ResponseEntity;
use App\Models\InventoryLocation;
use App\Models\Stock;

/**
 * @OA\Get(
 *   path="/api/v1/stock/by-location/{id}",
 *   summary="Get Stock Summary by Location",
 *   tags={"Stock"},
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer"), description="Inventory Location ID"),
 *   @OA\Response(response=200, description="Success", @OA\JsonContent(ref="#/components/schemas/ResponseEntity")),
 *   @OA\Response(response=404, description="Location Not Found"),
 * )
 */
class StockByLocationController extends Controller
{
    public function __invoke(int $id)
    {
        $location = InventoryLocation::findOrFail($id);

        $stockRecords = Stock::where('inventory_location_id', $id)
            ->with([
                'itemVariant.item',
            ])
            ->get();

        $items = $stockRecords->map(function ($stock) {
            return [
                'item_variant_id' => $stock->item_variant_id,
                'item_variant_code' => $stock->itemVariant->code,
                'item_variant_name' => $stock->itemVariant->name,
                'item_name' => $stock->itemVariant->item->name,
                'item_sku' => $stock->itemVariant->item->sku,
                'on_hand' => (float) $stock->on_hand,
                'reserved' => (float) $stock->reserved,
                'available' => (float) $stock->available,
                'weighted_avg_cost' => (float) $stock->weighted_avg_cost,
                'total_value' => (float) ($stock->on_hand * $stock->weighted_avg_cost),
            ];
        });

        $summary = [
            'total_variants' => $stockRecords->count(),
            'total_on_hand' => (float) $stockRecords->sum('on_hand'),
            'total_reserved' => (float) $stockRecords->sum('reserved'),
            'total_available' => (float) $stockRecords->sum('available'),
            'total_inventory_value' => (float) $stockRecords->map(fn($s) => $s->on_hand * $s->weighted_avg_cost)->sum(),
        ];

        return new ResponseEntity(
            data: [
                'inventory_location' => [
                    'id' => $location->id,
                    'name' => $location->name,
                    'type' => $location->type,
                    'operating_unit' => $location->operatingUnit->name,
                ],
                'summary' => $summary,
                'items' => $items,
            ]
        );
    }
}
