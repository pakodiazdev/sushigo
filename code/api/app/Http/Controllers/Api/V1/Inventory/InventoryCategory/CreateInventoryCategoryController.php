<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\InventoryCategory;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\InventoryCategory\StoreInventoryCategoryRequest;
use App\Http\Resources\Inventory\InventoryCategory\InventoryCategoryResource;
use App\Models\InventoryCategory;

/**
 * @OA\Post(
 *   path="/api/v1/inventory-categories",
 *   summary="Create Inventory Category",
 *   tags={"Inventory Categories"},
 *   security={{"passport": {}}},
 *
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/StoreInventoryCategoryRequest")),
 *
 *   @OA\Response(
 *       response=201,
 *       description="Inventory category created successfully",
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
 *   @OA\Response(response=403, description="Forbidden — requires inventory_categories.create permission"),
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class CreateInventoryCategoryController extends Controller
{
    public function __invoke(StoreInventoryCategoryRequest $request): InventoryCategoryResource
    {
        $category = InventoryCategory::create($request->categoryData());

        return (new InventoryCategoryResource($category))->setStatusCode(201);
    }
}
