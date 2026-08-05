<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Dishes\DishCategory;

use App\Http\Controllers\Controller;
use App\Http\Resources\Dishes\DishCategory\DishCategoryResource;
use App\Models\DishCategory;

/**
 * @OA\Get(
 *   path="/api/v1/dish-categories/{dishCategory}",
 *   summary="Get Dish Category by ID",
 *   tags={"Dish Categories"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="dishCategory", in="path", required=true, @OA\Schema(type="string"), description="Dish category public_id (ULID)"),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Dish category retrieved successfully",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *              @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *              @OA\Schema(@OA\Property(property="data", ref="#/components/schemas/DishCategoryResponse"))
 *           }
 *       )
 *   ),
 *
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires dishes.view permission"),
 *   @OA\Response(response=404, description="Dish category not found")
 * )
 */
class ShowDishCategoryController extends Controller
{
    public function __invoke(DishCategory $dishCategory): DishCategoryResource
    {
        $dishCategory->loadCount('dishes');

        return new DishCategoryResource($dishCategory);
    }
}
