<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Dishes\DishExtra;

use App\Http\Controllers\Controller;
use App\Http\Requests\Dishes\DishExtra\UpdateDishExtraGroupRequest;
use App\Http\Resources\Dishes\DishExtra\DishExtraGroupResource;
use App\Models\DishExtraGroup;

/**
 * @OA\Put(
 *   path="/api/v1/dish-extra-groups/{dishExtraGroup}",
 *   summary="Update Dish Extra Group",
 *   tags={"Dish Extra Groups"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="dishExtraGroup", in="path", required=true, @OA\Schema(type="string"), description="Dish extra group public_id (ULID)"),
 *
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/UpdateDishExtraGroupRequest")),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Dish extra group updated successfully",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *              @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *              @OA\Schema(@OA\Property(property="data", ref="#/components/schemas/DishExtraGroupResponse"))
 *           }
 *       )
 *   ),
 *
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires dishes.update permission"),
 *   @OA\Response(response=404, description="Dish extra group not found"),
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class UpdateDishExtraGroupController extends Controller
{
    public function __invoke(UpdateDishExtraGroupRequest $request, DishExtraGroup $dishExtraGroup): DishExtraGroupResource
    {
        $dishExtraGroup->update($request->extraGroupData());
        // Nested payloads only show active options — matches Dish::totalPriceFor()'s
        // notion of "available extras".
        $dishExtraGroup->load([
            'dish',
            'options' => fn ($query) => $query->where('is_active', true)->with('extraGroup'),
        ]);

        return new DishExtraGroupResource($dishExtraGroup);
    }
}
