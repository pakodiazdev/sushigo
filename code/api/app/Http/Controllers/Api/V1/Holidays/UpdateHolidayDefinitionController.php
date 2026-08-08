<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Holidays;

use App\Http\Controllers\Controller;
use App\Http\Requests\Holidays\UpdateHolidayDefinitionRequest;
use App\Http\Resources\Holiday\HolidayDefinitionResource;
use App\Models\HolidayDefinition;
use App\Services\HolidayGeneratorService;
use App\Support\Clock\ApplicationClock;

/**
 * @OA\Put(
 *   path="/api/v1/holiday-definitions/{holidayDefinition}",
 *   summary="Update Holiday Definition",
 *   description="Updates an existing holiday definition. Does not regenerate past instances. If is_annual=true, generates an instance for the current year if one does not exist.",
 *   tags={"Holidays"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="holidayDefinition", in="path", required=true, @OA\Schema(type="integer")),
 *
 *   @OA\RequestBody(
 *       required=true,
 *
 *       @OA\JsonContent(ref="#/components/schemas/UpdateHolidayDefinitionRequest")
 *   ),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Holiday definition updated",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *               @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *               @OA\Schema(@OA\Property(property="data", ref="#/components/schemas/HolidayDefinitionResponse"))
 *           }
 *       )
 *   ),
 *
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires holidays.manage permission"),
 *   @OA\Response(response=404, description="Holiday definition not found"),
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class UpdateHolidayDefinitionController extends Controller
{
    public function __construct(
        private readonly HolidayGeneratorService $generator,
        private readonly ApplicationClock $clock,
    ) {}

    public function __invoke(
        UpdateHolidayDefinitionRequest $request,
        HolidayDefinition $holidayDefinition,
    ): HolidayDefinitionResource {
        $holidayDefinition->update($request->definitionData($holidayDefinition));
        $holidayDefinition->refresh();

        // Generate current-year instance if now annual (and not already generated)
        if ($holidayDefinition->is_annual) {
            $this->generator->generateForYear((int) $this->clock->nowInBusinessTz()->year);
        }

        return new HolidayDefinitionResource($holidayDefinition);
    }
}
