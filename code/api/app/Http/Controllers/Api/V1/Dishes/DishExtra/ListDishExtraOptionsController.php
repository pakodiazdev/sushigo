<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Dishes\DishExtra;

use App\Http\Controllers\Controller;
use App\Http\Resources\Dishes\DishExtra\DishExtraOptionResource;
use App\Models\DishExtraGroup;
use App\Models\DishExtraOption;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * @OA\Get(
 *   path="/api/v1/dish-extra-options",
 *   summary="List Dish Extra Options",
 *   tags={"Dish Extra Options"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="dish_extra_group_id", in="query", @OA\Schema(type="string"), description="Dish extra group public_id (ULID)"),
 *   @OA\Parameter(name="is_active", in="query", @OA\Schema(type="boolean")),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Dish extra options retrieved successfully",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *              @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *              @OA\Schema(@OA\Property(property="data", type="array", @OA\Items(ref="#/components/schemas/DishExtraOptionResponse")))
 *           }
 *       )
 *   ),
 *
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires dishes.view permission")
 * )
 */
class ListDishExtraOptionsController extends Controller
{
    public function __invoke(Request $request): AnonymousResourceCollection
    {
        // position only orders options within their own group, so group by
        // dish_extra_group_id first — otherwise an unfiltered list interleaves options
        // from different groups that happen to share the same position value.
        $query = DishExtraOption::with('extraGroup')->orderBy('dish_extra_group_id')->orderBy('position');

        if ($request->filled('dish_extra_group_id')) {
            $groupId = DishExtraGroup::where('public_id', $request->string('dish_extra_group_id'))->value('id');
            $query->where('dish_extra_group_id', $groupId);
        }

        if ($request->filled('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        return DishExtraOptionResource::collection($query->get());
    }
}
