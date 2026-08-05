<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Dishes\DishCategory;

use App\Http\Controllers\Controller;
use App\Http\Requests\Dishes\DishCategory\UpdateDishCategoryRequest;
use App\Http\Resources\Dishes\DishCategory\DishCategoryResource;
use App\Models\DishCategory;

/**
 * @OA\Put(
 *   path="/api/v1/dish-categories/{dishCategory}",
 *   summary="Update Dish Category",
 *   tags={"Dish Categories"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="dishCategory", in="path", required=true, @OA\Schema(type="string"), description="Dish category public_id (ULID)"),
 *
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/UpdateDishCategoryRequest")),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Dish category updated successfully",
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
 *   @OA\Response(response=403, description="Forbidden — requires dishes.update permission"),
 *   @OA\Response(response=404, description="Dish category not found"),
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class UpdateDishCategoryController extends Controller
{
    public function __invoke(UpdateDishCategoryRequest $request, DishCategory $dishCategory): DishCategoryResource
    {
        $dishCategory->update($request->categoryData());
        $dishCategory->loadCount('dishes');

        return new DishCategoryResource($dishCategory);
    }
}
