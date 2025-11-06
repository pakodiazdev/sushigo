<?php

namespace App\Http\Controllers\Api\V1\InventoryLocation;

use App\Http\Controllers\Controller;
use App\Http\Responses\Common\ResponseEntity;
use App\Models\InventoryLocation;

/**
 * @OA\Get(
 *   path="/api/v1/inventory-locations/{id}",
 *   summary="Show Inventory Location",
 *   tags={"Inventory Locations"},
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
 *   @OA\Response(response=200, description="Success", @OA\JsonContent(ref="#/components/schemas/ResponseEntity")),
 *   @OA\Response(response=404, description="Not Found", @OA\JsonContent(ref="#/components/schemas/ResponseError")),
 * )
 */
class ShowInventoryLocationController extends Controller
{
    public function __invoke(int $id)
    {
        $location = InventoryLocation::with([
            'operatingUnit.branch',
            'stock.itemVariant.item',
        ])->findOrFail($id);

        // Calculate stock totals
        $stockTotals = $location->stock()
            ->selectRaw('
                COUNT(DISTINCT item_variant_id) as variant_count,
                SUM(on_hand) as total_on_hand,
                SUM(reserved) as total_reserved,
                SUM(available) as total_available
            ')
            ->first();

        return new ResponseEntity(
            data: [
                'id' => $location->id,
                'operating_unit_id' => $location->operating_unit_id,
                'name' => $location->name,
                'type' => $location->type,
                'priority' => $location->priority,
                'is_primary' => $location->is_primary,
                'is_active' => $location->is_active,
                'notes' => $location->notes,
                'operating_unit' => [
                    'id' => $location->operatingUnit->id,
                    'name' => $location->operatingUnit->name,
                    'type' => $location->operatingUnit->type,
                    'branch' => [
                        'id' => $location->operatingUnit->branch->id,
                        'code' => $location->operatingUnit->branch->code,
                        'name' => $location->operatingUnit->branch->name,
                    ],
                ],
                'stock_summary' => [
                    'variant_count' => (int) $stockTotals->variant_count,
                    'total_on_hand' => (float) $stockTotals->total_on_hand,
                    'total_reserved' => (float) $stockTotals->total_reserved,
                    'total_available' => (float) $stockTotals->total_available,
                ],
                'created_at' => $location->created_at,
                'updated_at' => $location->updated_at,
            ]
        );
    }
}
