<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Dishes\DishCategory;

use App\Http\Controllers\Controller;
use App\Http\Resources\Dishes\DishCategory\DishCategoryResource;
use App\Models\DishCategory;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * @OA\Get(
 *   path="/api/v1/dish-categories",
 *   summary="List Dish Categories",
 *   tags={"Dish Categories"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="is_active", in="query", @OA\Schema(type="boolean")),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Dish categories retrieved successfully",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *              @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *              @OA\Schema(@OA\Property(property="data", type="array", @OA\Items(ref="#/components/schemas/DishCategoryResponse")))
 *           }
 *       )
 *   ),
 *
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires dishes.view permission")
 * )
 */
class ListDishCategoriesController extends Controller
{
    public function __invoke(Request $request): AnonymousResourceCollection
    {
        $query = DishCategory::withCount('dishes')->orderBy('position');

        if ($request->filled('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        return DishCategoryResource::collection($query->get());
    }
}
