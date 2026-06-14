<?php

namespace App\Http\Controllers\Api\V1\Holidays;

use App\Http\Controllers\Controller;
use App\Http\Requests\Holidays\UpdateHolidayRequest;
use App\Http\Resources\Holiday\HolidayResource;
use App\Models\Holiday;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Response;

/**
 * @OA\Put(
 *   path="/api/v1/holidays/{id}",
 *   summary="Update Holiday",
 *   description="Updates an existing holiday in the catalog.",
 *   tags={"Holidays"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer"), description="Holiday ID"),
 *
 *   @OA\RequestBody(
 *       required=true,
 *
 *       @OA\JsonContent(ref="#/components/schemas/UpdateHolidayRequest")
 *   ),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Holiday updated successfully",
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
 *   @OA\Response(response=404, description="Holiday not found"),
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class UpdateHolidayController extends Controller
{
    public function __invoke(UpdateHolidayRequest $request, int $id): HolidayResource|Response
    {
        $holiday = Holiday::find($id);

        if (! $holiday) {
            throw new ModelNotFoundException("Holiday [{$id}] not found.");
        }

        $holiday->update($request->validated());

        return new HolidayResource($holiday);
    }
}
