<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Dishes\DishExtra;

use App\Http\Controllers\Controller;
use App\Http\Resources\Dishes\DishExtra\DishExtraGroupResource;
use App\Models\Dish;
use App\Models\DishExtraGroup;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * @OA\Get(
 *   path="/api/v1/dish-extra-groups",
 *   summary="List Dish Extra Groups",
 *   tags={"Dish Extra Groups"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="dish_id", in="query", @OA\Schema(type="string"), description="Dish public_id (ULID)"),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Dish extra groups retrieved successfully",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *              @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *              @OA\Schema(@OA\Property(property="data", type="array", @OA\Items(ref="#/components/schemas/DishExtraGroupResponse")))
 *           }
 *       )
 *   ),
 *
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires dishes.view permission")
 * )
 */
class ListDishExtraGroupsController extends Controller
{
    public function __invoke(Request $request): AnonymousResourceCollection
    {
        // Nested payloads only show active options — matches Dish::totalPriceFor()'s
        // notion of "available extras". Direct option management still goes
        // through the dedicated dish-extra-options endpoints.
        $query = DishExtraGroup::with([
            'dish',
            'options' => fn ($q) => $q->where('is_active', true)->with('extraGroup'),
        ])->orderBy('id');

        if ($request->filled('dish_id')) {
            $dishId = Dish::where('public_id', $request->string('dish_id'))->value('id');
            $query->where('dish_id', $dishId);
        }

        return DishExtraGroupResource::collection($query->get());
    }
}
