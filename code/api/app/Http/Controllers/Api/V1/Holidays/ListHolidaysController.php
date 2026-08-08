<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Holidays;

use App\Http\Controllers\Controller;
use App\Http\Resources\Holiday\HolidayResource;
use App\Models\Holiday;
use App\Services\HolidayGeneratorService;
use App\Support\Clock\ApplicationClock;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * @OA\Get(
 *   path="/api/v1/holidays",
 *   summary="List Holidays",
 *   description="Returns all holidays, optionally filtered by year. For annual definitions, auto-generates holiday instances for the requested year on first access.",
 *   tags={"Holidays"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="year", in="query", @OA\Schema(type="integer", example=2026), description="Filter holidays by year. Also triggers generation of annual holidays for that year."),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Holidays retrieved successfully",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *               @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *               @OA\Schema(
 *
 *                   @OA\Property(property="data", type="array", @OA\Items(ref="#/components/schemas/HolidayResponse")),
 *                   @OA\Property(property="meta", type="object",
 *                     @OA\Property(property="warnings", type="array", @OA\Items(type="string"), description="Floating holidays without a date for the requested year")
 *                   )
 *               )
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
    public function __construct(
        private readonly HolidayGeneratorService $generator,
        private readonly ApplicationClock $clock,
    ) {}

    public function __invoke(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'year' => ['sometimes', 'integer', 'min:2000', 'max:2100'],
        ]);

        $year = isset($validated['year']) ? (int) $validated['year'] : null;

        // Lazy generation: trigger for the requested year (or current year by default)
        $generationYear = $year ?? (int) $this->clock->nowInBusinessTz()->year;
        $result = $this->generator->generateForYear($generationYear);

        $query = Holiday::query()->orderBy('date');

        if ($year !== null) {
            $query->whereYear('date', $year);
        }

        $holidays = $query->get();

        return HolidayResource::collection($holidays)->additional([
            'meta' => [
                'warnings' => $result->warnings,
            ],
        ]);
    }
}
