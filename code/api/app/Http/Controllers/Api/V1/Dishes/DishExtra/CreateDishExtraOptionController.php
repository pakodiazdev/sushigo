<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Dishes\DishExtra;

use App\Http\Controllers\Controller;
use App\Http\Requests\Dishes\DishExtra\StoreDishExtraOptionRequest;
use App\Http\Resources\Dishes\DishExtra\DishExtraOptionResource;
use App\Models\DishExtraOption;

/**
 * @OA\Post(
 *   path="/api/v1/dish-extra-options",
 *   summary="Create Dish Extra Option",
 *   tags={"Dish Extra Options"},
 *   security={{"passport": {}}},
 *
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/StoreDishExtraOptionRequest")),
 *
 *   @OA\Response(
 *       response=201,
 *       description="Dish extra option created successfully",
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
 *   @OA\Response(response=403, description="Forbidden — requires dishes.create permission"),
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class CreateDishExtraOptionController extends Controller
{
    public function __invoke(StoreDishExtraOptionRequest $request): DishExtraOptionResource
    {
        $option = DishExtraOption::create($request->extraOptionData());
        $option->load('extraGroup');

        return (new DishExtraOptionResource($option))->setStatusCode(201);
    }
}
