<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Dishes\Dish;

use App\Http\Controllers\Controller;
use App\Http\Requests\Dishes\Dish\UpdateDishRequest;
use App\Http\Resources\Dishes\Dish\DishResource;
use App\Models\Dish;

/**
 * @OA\Put(
 *   path="/api/v1/dishes/{dish}",
 *   summary="Update Dish",
 *   tags={"Dishes"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="dish", in="path", required=true, @OA\Schema(type="string"), description="Dish public_id (ULID)"),
 *
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/UpdateDishRequest")),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Dish updated successfully",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *              @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *              @OA\Schema(@OA\Property(property="data", ref="#/components/schemas/DishResponse"))
 *           }
 *       )
 *   ),
 *
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires dishes.update permission"),
 *   @OA\Response(response=404, description="Dish not found"),
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class UpdateDishController extends Controller
{
    public function __invoke(UpdateDishRequest $request, Dish $dish): DishResource
    {
        $dish->update($request->dishData());
        $dish->load([
            'category',
            'extraGroups.dish',
            // Nested payloads only show active options — matches totalPriceFor()'s
            // notion of "available extras". Direct option management still goes
            // through the dedicated dish-extra-options endpoints.
            'extraGroups.options' => fn ($query) => $query->where('is_active', true)->with('extraGroup'),
        ]);

        return new DishResource($dish);
    }
}
