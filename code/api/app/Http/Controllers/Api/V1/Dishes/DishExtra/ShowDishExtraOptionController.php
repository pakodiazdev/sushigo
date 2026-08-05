<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Dishes\DishExtra;

use App\Http\Controllers\Controller;
use App\Http\Resources\Dishes\DishExtra\DishExtraOptionResource;
use App\Models\DishExtraOption;

/**
 * @OA\Get(
 *   path="/api/v1/dish-extra-options/{dishExtraOption}",
 *   summary="Get Dish Extra Option by ID",
 *   tags={"Dish Extra Options"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="dishExtraOption", in="path", required=true, @OA\Schema(type="string"), description="Dish extra option public_id (ULID)"),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Dish extra option retrieved successfully",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *              @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *              @OA\Schema(@OA\Property(property="data", ref="#/components/schemas/DishExtraOptionResponse"))
 *           }
 *       )
 *   ),
 *
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires dishes.view permission"),
 *   @OA\Response(response=404, description="Dish extra option not found")
 * )
 */
class ShowDishExtraOptionController extends Controller
{
    public function __invoke(DishExtraOption $dishExtraOption): DishExtraOptionResource
    {
        $dishExtraOption->load('extraGroup');

        return new DishExtraOptionResource($dishExtraOption);
    }
}
