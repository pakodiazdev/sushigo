<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Dishes\DishExtra;

use App\Http\Controllers\Controller;
use App\Models\DishExtraOption;
use Illuminate\Http\Response;

/**
 * @OA\Delete(
 *   path="/api/v1/dish-extra-options/{dishExtraOption}",
 *   summary="Delete Dish Extra Option",
 *   tags={"Dish Extra Options"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="dishExtraOption", in="path", required=true, @OA\Schema(type="string"), description="Dish extra option public_id (ULID)"),
 *
 *   @OA\Response(response=204, description="Dish extra option deleted"),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires dishes.delete permission"),
 *   @OA\Response(response=404, description="Dish extra option not found")
 * )
 */
class DeleteDishExtraOptionController extends Controller
{
    public function __invoke(DishExtraOption $dishExtraOption): Response
    {
        $dishExtraOption->delete();

        return response()->noContent();
    }
}
