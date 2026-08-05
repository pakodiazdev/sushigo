<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Dishes\DishExtra;

use App\Http\Controllers\Controller;
use App\Http\Requests\Dishes\DishExtra\StoreDishExtraGroupRequest;
use App\Http\Resources\Dishes\DishExtra\DishExtraGroupResource;
use App\Models\DishExtraGroup;

/**
 * @OA\Post(
 *   path="/api/v1/dish-extra-groups",
 *   summary="Create Dish Extra Group",
 *   tags={"Dish Extra Groups"},
 *   security={{"passport": {}}},
 *
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/StoreDishExtraGroupRequest")),
 *
 *   @OA\Response(
 *       response=201,
 *       description="Dish extra group created successfully",
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
 *   @OA\Response(response=403, description="Forbidden — requires dishes.create permission"),
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class CreateDishExtraGroupController extends Controller
{
    public function __invoke(StoreDishExtraGroupRequest $request): DishExtraGroupResource
    {
        $group = DishExtraGroup::create($request->extraGroupData());
        // Nested payloads only show active options — matches Dish::totalPriceFor()'s
        // notion of "available extras".
        $group->load([
            'dish',
            'options' => fn ($query) => $query->where('is_active', true)->with('extraGroup'),
        ]);

        return (new DishExtraGroupResource($group))->setStatusCode(201);
    }
}
