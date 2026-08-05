<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Dishes\Dish;

use App\Http\Controllers\Controller;
use App\Models\Dish;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

/**
 * @OA\Delete(
 *   path="/api/v1/dishes/{dish}",
 *   summary="Delete Dish",
 *   description="Deletes a dish. Cascades to delete its extra groups and options.",
 *   tags={"Dishes"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="dish", in="path", required=true, @OA\Schema(type="string"), description="Dish public_id (ULID)"),
 *
 *   @OA\Response(response=204, description="Dish deleted"),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires dishes.delete permission"),
 *   @OA\Response(response=404, description="Dish not found")
 * )
 */
class DeleteDishController extends Controller
{
    public function __invoke(Dish $dish): Response
    {
        // The cascade (dish -> extra groups -> options) spans multiple tables; wrap in
        // a transaction so a mid-cascade failure can't leave it partial.
        DB::transaction(fn () => $dish->delete());

        return response()->noContent();
    }
}
