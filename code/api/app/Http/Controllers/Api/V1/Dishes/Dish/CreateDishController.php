<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Dishes\Dish;

use App\Http\Controllers\Controller;
use App\Http\Requests\Dishes\Dish\StoreDishRequest;
use App\Http\Resources\Dishes\Dish\DishResource;
use App\Models\Dish;

/**
 * @OA\Post(
 *   path="/api/v1/dishes",
 *   summary="Create Dish",
 *   tags={"Dishes"},
 *   security={{"passport": {}}},
 *
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/StoreDishRequest")),
 *
 *   @OA\Response(
 *       response=201,
 *       description="Dish created successfully",
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
 *   @OA\Response(response=403, description="Forbidden — requires dishes.create permission"),
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class CreateDishController extends Controller
{
    public function __invoke(StoreDishRequest $request): DishResource
    {
        $dish = Dish::create($request->dishData());
        $dish->load([
            'category',
            'extraGroups.dish',
            // Nested payloads only show active options — matches totalPriceFor()'s
            // notion of "available extras". Direct option management still goes
            // through the dedicated dish-extra-options endpoints.
            'extraGroups.options' => fn ($query) => $query->where('is_active', true)->with('extraGroup'),
        ]);

        return (new DishResource($dish))->setStatusCode(201);
    }
}
