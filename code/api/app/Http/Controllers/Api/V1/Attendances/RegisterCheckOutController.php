<?php

namespace App\Http\Controllers\Api\V1\Attendances;

use App\Actions\Attendances\RegisterCheckOutAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Attendances\CheckOutRequest;
use App\Http\Responses\Common\ResponseEntity;
use App\Models\Attendance;

/**
 * PATCH /api/v1/attendances/{id}/check-out
 *
 * Register the employee's departure time.
 * Calculates net_worked_minutes and overtime_minutes.
 *
 * @OA\Patch(
 *     path="/api/v1/attendances/{id}/check-out",
 *     summary="Register check-out",
 *     tags={"Attendances"},
 *     security={{"passport":{}}},
 *     @OA\Parameter(
 *         name="id",
 *         in="path",
 *         required=true,
 *         description="Attendance public_id (ULID)",
 *         @OA\Schema(type="string", example="01JN4Z8RFPQRSTUV0WXYZ12345")
 *     ),
 *     @OA\RequestBody(
 *         required=true,
 *         @OA\JsonContent(ref="#/components/schemas/CheckOutRequest")
 *     ),
 *     @OA\Response(
 *         response=200,
 *         description="Check-out registered",
 *         @OA\JsonContent(
 *             allOf={
 *                 @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *                 @OA\Schema(@OA\Property(property="data", ref="#/components/schemas/AttendanceResponse"))
 *             }
 *         )
 *     ),
 *     @OA\Response(response=404, description="Attendance not found"),
 *     @OA\Response(response=422, description="Validation or business rule error"),
 *     @OA\Response(response=401, description="Unauthenticated")
 * )
 */
class RegisterCheckOutController extends Controller
{
    public function __construct(private readonly RegisterCheckOutAction $action) {}

    public function __invoke(CheckOutRequest $request, string $id): ResponseEntity
    {
        $attendance = Attendance::where('public_id', $id)->firstOrFail();

        $attendance = ($this->action)($attendance, $request->validated());

        return new ResponseEntity(data: $attendance->toApiArray(), status: 200);
    }
}
