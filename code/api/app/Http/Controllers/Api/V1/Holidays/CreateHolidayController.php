<?php

namespace App\Http\Controllers\Api\V1\Holidays;

use App\Http\Controllers\Controller;
use App\Http\Requests\Holidays\StoreHolidayRequest;
use App\Http\Resources\Holiday\HolidayResource;
use App\Models\Holiday;

/**
 * @OA\Post(
 *   path="/api/v1/holidays",
 *   summary="Create Holiday",
 *   description="Creates a new holiday in the catalog.",
 *   tags={"Holidays"},
 *   security={{"passport": {}}},
 *
 *   @OA\RequestBody(
 *       required=true,
 *
 *       @OA\JsonContent(ref="#/components/schemas/StoreHolidayRequest")
 *   ),
 *
 *   @OA\Response(
 *       response=201,
 *       description="Holiday created successfully",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *               @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *               @OA\Schema(@OA\Property(property="data", ref="#/components/schemas/HolidayResponse"))
 *           }
 *       )
 *   ),
 *
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires holidays.manage permission"),
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class CreateHolidayController extends Controller
{
    public function __invoke(StoreHolidayRequest $request): HolidayResource
    {
        $holiday = Holiday::create($request->validated());
        $holiday->refresh();

        return (new HolidayResource($holiday))->setStatusCode(201);
    }
}
