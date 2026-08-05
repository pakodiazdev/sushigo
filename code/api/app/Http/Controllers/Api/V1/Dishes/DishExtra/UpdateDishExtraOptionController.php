<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Dishes\DishExtra;

use App\Http\Controllers\Controller;
use App\Http\Requests\Dishes\DishExtra\UpdateDishExtraOptionRequest;
use App\Http\Resources\Dishes\DishExtra\DishExtraOptionResource;
use App\Models\DishExtraOption;

/**
 * @OA\Put(
 *   path="/api/v1/dish-extra-options/{dishExtraOption}",
 *   summary="Update Dish Extra Option",
 *   tags={"Dish Extra Options"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="dishExtraOption", in="path", required=true, @OA\Schema(type="string"), description="Dish extra option public_id (ULID)"),
 *
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/UpdateDishExtraOptionRequest")),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Dish extra option updated successfully",
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
 *   @OA\Response(response=403, description="Forbidden — requires dishes.update permission"),
 *   @OA\Response(response=404, description="Dish extra option not found"),
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class UpdateDishExtraOptionController extends Controller
{
    public function __invoke(UpdateDishExtraOptionRequest $request, DishExtraOption $dishExtraOption): DishExtraOptionResource
    {
        $dishExtraOption->update($request->extraOptionData());
        $dishExtraOption->load('extraGroup');

        return new DishExtraOptionResource($dishExtraOption);
    }
}
