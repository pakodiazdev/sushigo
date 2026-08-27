<?php

namespace App\Http\Controllers\Api\V1\Stock;

use App\Http\Controllers\Api\V1\Stock\Concerns\SummarizesStock;
use App\Http\Controllers\Controller;
use App\Http\Responses\Common\ResponseEntity;
use App\Models\ItemVariant;
use App\Models\Stock;
use App\Services\Inventory\ReplenishmentPolicyResolver;

/**
 * @OA\Get(
 *   path="/api/v1/stock/by-variant/{id}",
 *   summary="Get Stock Summary by Item Variant",
 *   tags={"Stock"},
 *
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer"), description="Item Variant ID"),
 *
 *   @OA\Response(response=200, description="Success", @OA\JsonContent(ref="#/components/schemas/ResponseEntity")),
 *   @OA\Response(response=404, description="Item Variant Not Found"),
 * )
 */
class StockByVariantController extends Controller
{
    use SummarizesStock;

    public function __invoke(string $id, ReplenishmentPolicyResolver $resolver)
    {
        $variant = ItemVariant::with(['item'])->where('public_id', $id)->firstOrFail();

        $stockRecords = Stock::where('item_variant_id', $variant->id)
            ->with([
                'inventoryLocation.operatingUnit',
            ])
            ->get();

        $policies = $resolver->resolveManyForVariant($variant->id, $stockRecords->pluck('inventory_location_id'));

        $locations = $stockRecords->map(function ($stock) use ($policies) {
            return [
                'inventory_location_id' => $stock->inventoryLocation->public_id,
                'location_name' => $stock->inventoryLocation->name,
                'location_type' => $stock->inventoryLocation->type,
                'operating_unit' => $stock->inventoryLocation->operatingUnit->name,
                ...$this->stockMoneyFields($stock, $policies->get($stock->inventory_location_id)),
            ];
        });

        $summary = [
            'total_locations' => $stockRecords->count(),
            ...$this->stockTotals($stockRecords),
            'low_stock_locations' => $this->countLowStock($stockRecords, $policies, 'inventory_location_id'),
            'avg_weighted_cost' => (float) $stockRecords->avg('weighted_avg_cost'),
            'total_inventory_value' => (float) $stockRecords->map(fn ($s) => $s->on_hand * $s->weighted_avg_cost)->sum(),
        ];

        return new ResponseEntity(
            data: [
                'item_variant' => [
                    'id' => $variant->public_id,
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
