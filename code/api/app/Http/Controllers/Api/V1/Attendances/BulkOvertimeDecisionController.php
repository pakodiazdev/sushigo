<?php

namespace App\Http\Controllers\Api\V1\Attendances;

use App\Actions\Attendances\RecordBulkOvertimeDecisionAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Attendances\BulkOvertimeDecisionRequest;
use App\Http\Resources\Attendance\AttendanceResource;
use App\Http\Responses\Common\ResponseEntity;

/**
 * POST /api/v1/attendances/overtime-decisions/bulk
 *
 * Authorize or reject overtime payment for several attendances at once, applying
 * the same decision to every one of them in a single request.
 *
 * @OA\Post(
 *     path="/api/v1/attendances/overtime-decisions/bulk",
 *     summary="Authorize or reject overtime payment for a batch of attendances",
 *     tags={"Attendances"},
 *     security={{"passport":{}}},
 *
 *     @OA\RequestBody(
 *         required=true,
 *
 *         @OA\JsonContent(ref="#/components/schemas/BulkOvertimeDecisionRequest")
 *     ),
 *
 *     @OA\Response(
 *         response=200,
 *         description="Per-attendance results — a failed item does not block the rest of the batch",
 *
 *         @OA\JsonContent(
 *
 *             @OA\Property(property="status", type="integer", example=200),
 *             @OA\Property(
 *                 property="data",
 *                 type="object",
 *                 @OA\Property(
 *                     property="results",
 *                     type="array",
 *
 *                     @OA\Items(
 *                         type="object",
 *
 *                         @OA\Property(property="attendance_id", type="string", example="01JN4Z8RFPQRSTUV0WXYZ12345"),
 *                         @OA\Property(property="success", type="boolean", example=true),
 *                         @OA\Property(property="attendance", ref="#/components/schemas/AttendanceResponse", nullable=true),
 *                         @OA\Property(property="error", type="string", nullable=true, example="Ya se registró una decisión sobre las horas extra de este empleado.")
 *                     )
 *                 )
 *             )
 *         )
 *     ),
 *
 *     @OA\Response(response=422, description="Validation error"),
 *     @OA\Response(response=403, description="Not authorized to edit one or more of the given attendances"),
 *     @OA\Response(response=401, description="Unauthenticated")
 * )
 */
class BulkOvertimeDecisionController extends Controller
{
    public function __construct(private readonly RecordBulkOvertimeDecisionAction $action) {}

    public function __invoke(BulkOvertimeDecisionRequest $request): ResponseEntity
    {
        $attendances = $request->resolveAttendances();

        $results = ($this->action)($attendances, $request->decisionData(), $request->user());

        $results = array_map(function (array $result) {
            if ($result['attendance'] !== null) {
                $result['attendance'] = new AttendanceResource($result['attendance']);
            }

            return $result;
        }, $results);

        return new ResponseEntity(data: ['results' => $results], status: 200);
    }
}
