<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\InventoryCategory;

use App\Http\Controllers\Controller;
use App\Http\Resources\Inventory\InventoryCategory\InventoryCategoryResource;
use App\Models\InventoryCategory;

/**
 * @OA\Get(
 *   path="/api/v1/inventory-categories/{inventoryCategory}",
 *   summary="Get Inventory Category by ID",
 *   tags={"Inventory Categories"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="inventoryCategory", in="path", required=true, @OA\Schema(type="string"), description="Inventory category public_id (ULID)"),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Inventory category retrieved successfully",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *              @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *              @OA\Schema(@OA\Property(property="data", ref="#/components/schemas/InventoryCategoryResponse"))
 *           }
 *       )
 *   ),
 *
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires inventory_categories.view permission"),
 *   @OA\Response(response=404, description="Inventory category not found")
 * )
 */
class ShowInventoryCategoryController extends Controller
{
    public function __invoke(InventoryCategory $inventoryCategory): InventoryCategoryResource
    {
        return new InventoryCategoryResource($inventoryCategory);
    }
}
