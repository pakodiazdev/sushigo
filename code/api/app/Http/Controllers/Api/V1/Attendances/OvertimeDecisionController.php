<?php

namespace App\Http\Controllers\Api\V1\Attendances;

use App\Actions\Attendances\RecordOvertimeDecisionAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Attendances\OvertimeDecisionRequest;
use App\Http\Resources\Attendance\AttendanceResource;
use App\Models\Attendance;

/**
 * PATCH /api/v1/attendances/{id}/overtime-decision
 *
 * Authorize or reject overtime payment for a given attendance record.
 * The decision can only be recorded once per attendance.
 *
 * @OA\Patch(
 *     path="/api/v1/attendances/{id}/overtime-decision",
 *     summary="Authorize or reject overtime payment",
 *     tags={"Attendances"},
 *     security={{"passport":{}}},
 *
 *     @OA\Parameter(
 *         name="id",
 *         in="path",
 *         required=true,
 *         description="Attendance public_id (ULID)",
 *
 *         @OA\Schema(type="string", example="01JN4Z8RFPQRSTUV0WXYZ12345")
 *     ),
 *
 *     @OA\RequestBody(
 *         required=true,
 *
 *         @OA\JsonContent(ref="#/components/schemas/OvertimeDecisionRequest")
 *     ),
 *
 *     @OA\Response(
 *         response=200,
 *         description="Overtime decision recorded",
 *
 *         @OA\JsonContent(
 *             allOf={
 *
 *                 @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *                 @OA\Schema(@OA\Property(property="data", ref="#/components/schemas/AttendanceResponse"))
 *             }
 *         )
 *     ),
 *
 *     @OA\Response(response=404, description="Attendance not found"),
 *     @OA\Response(response=422, description="No overtime to decide on, or decision already recorded"),
 *     @OA\Response(response=401, description="Unauthenticated")
 * )
 */
class OvertimeDecisionController extends Controller
{
    public function __construct(private readonly RecordOvertimeDecisionAction $action) {}

    public function __invoke(OvertimeDecisionRequest $request, string $id): AttendanceResource
    {
        $attendance = Attendance::where('public_id', $id)->firstOrFail();

        $attendance = ($this->action)($attendance, $request->validated(), $request->user());

        return new AttendanceResource($attendance);
    }
}
