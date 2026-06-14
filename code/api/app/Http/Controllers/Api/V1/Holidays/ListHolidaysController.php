<?php

namespace App\Http\Controllers\Api\V1\Holidays;

use App\Http\Controllers\Controller;
use App\Http\Resources\Holiday\HolidayResource;
use App\Models\Holiday;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * @OA\Get(
 *   path="/api/v1/holidays",
 *   summary="List Holidays",
 *   description="Returns all holidays, optionally filtered by year.",
 *   tags={"Holidays"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="year", in="query", @OA\Schema(type="integer", example=2026), description="Filter holidays by year"),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Holidays retrieved successfully",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *               @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *               @OA\Schema(@OA\Property(property="data", type="array", @OA\Items(ref="#/components/schemas/HolidayResponse")))
 *           }
 *       )
 *   ),
 *
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires holidays.manage permission")
 * )
 */
class ListHolidaysController extends Controller
{
    public function __invoke(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'year' => ['sometimes', 'integer', 'min:2000', 'max:2100'],
        ]);

        $query = Holiday::query()->orderBy('date');

        if (isset($validated['year'])) {
            $query->whereYear('date', $validated['year']);
        }

        $holidays = $query->get();

        return HolidayResource::collection($holidays);
    }
}
