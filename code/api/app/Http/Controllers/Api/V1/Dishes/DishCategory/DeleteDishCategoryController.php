<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Dishes\DishCategory;

use App\Http\Controllers\Controller;
use App\Models\DishCategory;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

/**
 * @OA\Delete(
 *   path="/api/v1/dish-categories/{dishCategory}",
 *   summary="Delete Dish Category",
 *   description="Deletes a dish category. Cascades to delete its dishes, extra groups and options.",
 *   tags={"Dish Categories"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="dishCategory", in="path", required=true, @OA\Schema(type="string"), description="Dish category public_id (ULID)"),
 *
 *   @OA\Response(response=204, description="Dish category deleted"),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires dishes.delete permission"),
 *   @OA\Response(response=404, description="Dish category not found")
 * )
 */
class DeleteDishCategoryController extends Controller
{
    public function __invoke(DishCategory $dishCategory): Response
    {
        // The cascade (category -> dishes -> extra groups -> options) spans multiple
        // tables; wrap in a transaction so a mid-cascade failure can't leave it partial.
        DB::transaction(fn () => $dishCategory->delete());

        return response()->noContent();
    }
}
