<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Holidays;

use App\Http\Controllers\Controller;
use App\Http\Resources\Holiday\HolidayDefinitionResource;
use App\Models\HolidayDefinition;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * @OA\Get(
 *   path="/api/v1/holiday-definitions",
 *   summary="List Holiday Definitions",
 *   description="Returns all holiday definitions with their recurrence configuration.",
 *   tags={"Holidays"},
 *   security={{"passport": {}}},
 *
 *   @OA\Response(
 *       response=200,
 *       description="Holiday definitions retrieved successfully",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *               @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *               @OA\Schema(@OA\Property(property="data", type="array", @OA\Items(ref="#/components/schemas/HolidayDefinitionResponse")))
 *           }
 *       )
 *   ),
 *
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires holidays.manage permission")
 * )
 */
class ListHolidayDefinitionsController extends Controller
{
    public function __invoke(): AnonymousResourceCollection
    {
        $definitions = HolidayDefinition::orderBy('name')->get();

        return HolidayDefinitionResource::collection($definitions);
    }
}
