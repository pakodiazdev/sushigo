<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Dishes\Dish;

use App\Http\Controllers\Api\V1\Dishes\Dish\Concerns\LoadsDishRelations;
use App\Http\Controllers\Controller;
use App\Http\Resources\Dishes\Dish\DishResource;
use App\Models\Dish;

/**
 * @OA\Get(
 *   path="/api/v1/dishes/{dish}",
 *   summary="Get Dish by ID",
 *   tags={"Dishes"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="dish", in="path", required=true, @OA\Schema(type="string"), description="Dish public_id (ULID)"),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Dish retrieved successfully",
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
 *   @OA\Response(response=403, description="Forbidden — requires dishes.view permission"),
 *   @OA\Response(response=404, description="Dish not found")
 * )
 */
class ShowDishController extends Controller
{
    use LoadsDishRelations;

    public function __invoke(Dish $dish): DishResource
    {
        $dish->load($this->dishEagerLoadRelations());

        return new DishResource($dish);
    }
}
