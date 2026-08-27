<?php

namespace App\Http\Controllers\Api\V1\Stock;

use App\Http\Controllers\Api\V1\Stock\Concerns\SummarizesStock;
use App\Http\Controllers\Controller;
use App\Http\Responses\Common\ResponseEntity;
use App\Models\InventoryLocation;
use App\Models\Stock;
use App\Services\Inventory\ReplenishmentPolicyResolver;

/**
 * @OA\Get(
 *   path="/api/v1/stock/by-location/{id}",
 *   summary="Get Stock Summary by Location",
 *   tags={"Stock"},
 *
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer"), description="Inventory Location ID"),
 *
 *   @OA\Response(response=200, description="Success", @OA\JsonContent(ref="#/components/schemas/ResponseEntity")),
 *   @OA\Response(response=404, description="Location Not Found"),
 * )
 */
class StockByLocationController extends Controller
{
    use SummarizesStock;

    public function __invoke(string $id, ReplenishmentPolicyResolver $resolver)
    {
        $location = InventoryLocation::findByPublicIdOrFail($id);

        $stockRecords = Stock::where('inventory_location_id', $location->id)
            ->with([
                'itemVariant.item',
            ])
            ->get();

        $policies = $resolver->resolveManyForLocation($location->id, $stockRecords->pluck('item_variant_id'));

        $items = $stockRecords->map(function ($stock) use ($policies) {
            return [
                'item_variant_id' => $stock->itemVariant->public_id,
                'item_variant_code' => $stock->itemVariant->code,
                'item_variant_name' => $stock->itemVariant->name,
                'item_name' => $stock->itemVariant->item->name,
                'item_sku' => $stock->itemVariant->item->sku,
                ...$this->stockMoneyFields($stock, $policies->get($stock->item_variant_id)),
            ];
        });

        $summary = [
            'total_variants' => $stockRecords->count(),
            ...$this->stockTotals($stockRecords),
            'low_stock_variants' => $this->countLowStock($stockRecords, $policies, 'item_variant_id'),
            'total_inventory_value' => (float) $stockRecords->map(fn ($s) => $s->on_hand * $s->weighted_avg_cost)->sum(),
        ];

        return new ResponseEntity(
            data: [
                'inventory_location' => [
                    'id' => $location->public_id,
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
