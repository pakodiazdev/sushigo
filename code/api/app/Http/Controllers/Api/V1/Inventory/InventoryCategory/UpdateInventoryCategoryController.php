<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\InventoryCategory;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\InventoryCategory\UpdateInventoryCategoryRequest;
use App\Http\Resources\Inventory\InventoryCategory\InventoryCategoryResource;
use App\Models\InventoryCategory;

/**
 * @OA\Put(
 *   path="/api/v1/inventory-categories/{inventoryCategory}",
 *   summary="Update Inventory Category",
 *   description="Rejects deactivation (is_active=false) while the category is still referenced by an active Product.",
 *   tags={"Inventory Categories"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="inventoryCategory", in="path", required=true, @OA\Schema(type="string"), description="Inventory category public_id (ULID)"),
 *
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/UpdateInventoryCategoryRequest")),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Inventory category updated successfully",
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
 *   @OA\Response(response=403, description="Forbidden — requires inventory_categories.update permission"),
 *   @OA\Response(response=404, description="Inventory category not found"),
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class UpdateInventoryCategoryController extends Controller
{
    public function __invoke(UpdateInventoryCategoryRequest $request, InventoryCategory $inventoryCategory): InventoryCategoryResource
    {
        $inventoryCategory->update($request->categoryData());

        return new InventoryCategoryResource($inventoryCategory);
    }
}
