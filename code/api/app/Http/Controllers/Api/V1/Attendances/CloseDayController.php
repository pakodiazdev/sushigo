<?php

namespace App\Http\Controllers\Api\V1\Attendances;

use App\Actions\Attendances\CloseDayAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Attendances\CloseDayRequest;
use App\Http\Responses\Common\ResponseEntity;

/**
 * POST /api/v1/attendances/close-day
 *
 * Closes the current day for a branch: registers pending lunch returns,
 * applies batch check-out, and marks absences — all in one transaction.
 *
 * @OA\Post(
 *     path="/api/v1/attendances/close-day",
 *     summary="Close the day (batch check-out + absences)",
 *     tags={"Attendances"},
 *     security={{"passport":{}}},
 *
 *     @OA\RequestBody(
 *         required=true,
 *
 *         @OA\JsonContent(ref="#/components/schemas/CloseDayRequest")
 *     ),
 *
 *     @OA\Response(
 *         response=200,
 *         description="Day closed successfully",
 *
 *         @OA\JsonContent(
 *
 *             @OA\Property(property="status", type="integer", example=200),
 *             @OA\Property(
 *                 property="data",
 *                 type="object",
 *                 @OA\Property(property="lunch_returns", type="integer", example=2),
 *                 @OA\Property(property="check_outs", type="integer", example=5),
 *                 @OA\Property(property="absences", type="integer", example=1),
 *                 @OA\Property(property="leaves", type="integer", example=0),
 *                 @OA\Property(property="day_offs", type="integer", example=1),
 *                 @OA\Property(
 *                     property="overtime_pending",
 *                     type="array",
 *                     description="Employees who worked overtime and have no authorization decision yet",
 *
 *                     @OA\Items(
 *                         type="object",
 *
 *                         @OA\Property(property="attendance_id", type="string", example="01J..."),
 *                         @OA\Property(property="employee_name", type="string", example="Ana López"),
 *                         @OA\Property(property="overtime_minutes", type="integer", example=35)
 *                     )
 *                 )
 *             )
 *         )
 *     ),
 *
 *     @OA\Response(response=422, description="Validation error"),
 *     @OA\Response(response=401, description="Unauthenticated")
 * )
 */
class CloseDayController extends Controller
{
    public function __invoke(CloseDayRequest $request, CloseDayAction $action): ResponseEntity
    {
        $counts = $action($request->validated());

        return new ResponseEntity(data: $counts, status: 200);
    }
}
