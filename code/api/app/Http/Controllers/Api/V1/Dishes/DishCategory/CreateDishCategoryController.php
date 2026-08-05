<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Dishes\DishCategory;

use App\Http\Controllers\Controller;
use App\Http\Requests\Dishes\DishCategory\StoreDishCategoryRequest;
use App\Http\Resources\Dishes\DishCategory\DishCategoryResource;
use App\Models\DishCategory;

/**
 * @OA\Post(
 *   path="/api/v1/dish-categories",
 *   summary="Create Dish Category",
 *   tags={"Dish Categories"},
 *   security={{"passport": {}}},
 *
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/StoreDishCategoryRequest")),
 *
 *   @OA\Response(
 *       response=201,
 *       description="Dish category created successfully",
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
 *   @OA\Response(response=403, description="Forbidden — requires dishes.create permission"),
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class CreateDishCategoryController extends Controller
{
    public function __invoke(StoreDishCategoryRequest $request): DishCategoryResource
    {
        $category = DishCategory::create($request->categoryData());
        $category->loadCount('dishes');

        return (new DishCategoryResource($category))->setStatusCode(201);
    }
}
