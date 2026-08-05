<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Dishes\DishExtra;

use App\Http\Controllers\Controller;
use App\Models\DishExtraGroup;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

/**
 * @OA\Delete(
 *   path="/api/v1/dish-extra-groups/{dishExtraGroup}",
 *   summary="Delete Dish Extra Group",
 *   description="Deletes a dish extra group. Cascades to delete its options.",
 *   tags={"Dish Extra Groups"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="dishExtraGroup", in="path", required=true, @OA\Schema(type="string"), description="Dish extra group public_id (ULID)"),
 *
 *   @OA\Response(response=204, description="Dish extra group deleted"),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires dishes.delete permission"),
 *   @OA\Response(response=404, description="Dish extra group not found")
 * )
 */
class DeleteDishExtraGroupController extends Controller
{
    public function __invoke(DishExtraGroup $dishExtraGroup): Response
    {
        // The cascade (group -> options) spans multiple rows/tables; wrap in a
        // transaction so a mid-cascade failure can't leave it partial.
        DB::transaction(fn () => $dishExtraGroup->delete());

        return response()->noContent();
    }
}
