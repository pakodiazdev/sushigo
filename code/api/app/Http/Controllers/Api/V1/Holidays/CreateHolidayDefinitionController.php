<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Holidays;

use App\Http\Controllers\Controller;
use App\Http\Requests\Holidays\StoreHolidayDefinitionRequest;
use App\Http\Resources\Holiday\HolidayDefinitionResource;
use App\Models\Holiday;
use App\Models\HolidayDefinition;
use App\Services\HolidayGeneratorService;
use App\Support\Clock\ApplicationClock;

/**
 * @OA\Post(
 *   path="/api/v1/holiday-definitions",
 *   summary="Create Holiday Definition",
 *   description="Creates a new holiday definition. If is_annual=true, generates an instance for the current year immediately.",
 *   tags={"Holidays"},
 *   security={{"passport": {}}},
 *
 *   @OA\RequestBody(
 *       required=true,
 *
 *       @OA\JsonContent(ref="#/components/schemas/StoreHolidayDefinitionRequest")
 *   ),
 *
 *   @OA\Response(
 *       response=201,
 *       description="Holiday definition created",
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
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class CreateHolidayDefinitionController extends Controller
{
    public function __construct(
        private readonly HolidayGeneratorService $generator,
        private readonly ApplicationClock $clock,
    ) {}

    public function __invoke(StoreHolidayDefinitionRequest $request): HolidayDefinitionResource
    {
        $data = $request->definitionData();

        $definition = HolidayDefinition::create($data);

        if ($definition->is_annual) {
            // Auto-generate instances for current year via lazy generator
            $this->generator->generateForYear((int) $this->clock->nowInBusinessTz()->year);
        } elseif (isset($data['date'])) {
            // One-off holiday: create a single instance from the provided date
            Holiday::create([
                'definition_id' => $definition->id,
                'name' => $definition->name,
                'date' => $data['date'],
                'type' => $definition->type,
                'pay_multiplier' => (float) $definition->pay_multiplier,
                'is_auto_generated' => false,
            ]);
        }

        $definition->refresh();

        return (new HolidayDefinitionResource($definition))->setStatusCode(201);
    }
}
