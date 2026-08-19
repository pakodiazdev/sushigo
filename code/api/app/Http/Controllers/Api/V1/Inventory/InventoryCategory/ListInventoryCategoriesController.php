<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\InventoryCategory;

use App\Http\Controllers\Controller;
use App\Http\Resources\Inventory\InventoryCategory\InventoryCategoryResource;
use App\Models\InventoryCategory;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * @OA\Get(
 *   path="/api/v1/inventory-categories",
 *   summary="List Inventory Categories",
 *   tags={"Inventory Categories"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="is_active", in="query", @OA\Schema(type="boolean")),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Inventory categories retrieved successfully",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *              @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *              @OA\Schema(@OA\Property(property="data", type="array", @OA\Items(ref="#/components/schemas/InventoryCategoryResponse")))
 *           }
 *       )
 *   ),
 *
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires inventory_categories.view permission")
 * )
 */
class ListInventoryCategoriesController extends Controller
{
    public function __invoke(Request $request): AnonymousResourceCollection
    {
        $query = InventoryCategory::query()->orderBy('position');

        if ($request->filled('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        return InventoryCategoryResource::collection($query->get());
    }
}
