<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Dishes\Dish;

use App\Http\Controllers\Controller;
use App\Http\Resources\Dishes\Dish\DishResource;
use App\Models\Dish;
use App\Models\DishCategory;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * @OA\Get(
 *   path="/api/v1/dishes",
 *   summary="List Dishes",
 *   tags={"Dishes"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="dish_category_id", in="query", @OA\Schema(type="string"), description="Dish category public_id (ULID)"),
 *   @OA\Parameter(name="is_active", in="query", @OA\Schema(type="boolean")),
 *   @OA\Parameter(name="search", in="query", @OA\Schema(type="string")),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Dishes retrieved successfully",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *              @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *              @OA\Schema(@OA\Property(property="data", type="array", @OA\Items(ref="#/components/schemas/DishResponse")))
 *           }
 *       )
 *   ),
 *
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires dishes.view permission")
 * )
 */
class ListDishesController extends Controller
{
    public function __invoke(Request $request): AnonymousResourceCollection
    {
        // position only orders dishes within their own category, so order by the
        // category's own configured display position first — ordering by
        // dish_category_id instead would reflect category creation order, not
        // the menu's configured section order, and wouldn't move if a category
        // is reordered.
        $query = Dish::with([
            'category',
            'extraGroups.dish',
            // Nested payloads only show active options — matches totalPriceFor()'s
            // notion of "available extras". Direct option management still goes
            // through the dedicated dish-extra-options endpoints.
            'extraGroups.options' => fn ($q) => $q->where('is_active', true)->with('extraGroup'),
        ])
            ->select('dishes.*')
            ->join('dish_categories', 'dishes.dish_category_id', '=', 'dish_categories.id')
            ->orderBy('dish_categories.position')
            ->orderBy('dishes.position');

        if ($request->filled('dish_category_id')) {
            $categoryId = DishCategory::where('public_id', $request->string('dish_category_id'))->value('id');
            $query->where('dishes.dish_category_id', $categoryId);
        }

        if ($request->filled('is_active')) {
            $query->where('dishes.is_active', $request->boolean('is_active'));
        }

        if ($request->filled('search')) {
            $query->where('dishes.name', 'ILIKE', '%'.$request->string('search').'%');
        }

        return DishResource::collection($query->get());
    }
}
