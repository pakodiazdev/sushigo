<?php

namespace App\Http\Controllers\Api\V1\Attendances;

use App\Actions\Attendances\RegisterLunchReturnAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Attendances\LunchReturnRequest;
use App\Http\Responses\Common\ResponseEntity;
use App\Models\Attendance;

/**
 * PATCH /api/v1/attendances/{id}/lunch-return
 *
 * Register the moment an employee returns from their lunch break.
 * Calculates lunch_late_seconds from schedule configuration.
 *
 * @OA\Patch(
 *     path="/api/v1/attendances/{id}/lunch-return",
 *     summary="Register lunch-return",
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
 *         @OA\JsonContent(ref="#/components/schemas/LunchReturnRequest")
 *     ),
 *     @OA\Response(
 *         response=200,
 *         description="Lunch return registered",
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
class RegisterLunchReturnController extends Controller
{
    public function __construct(private readonly RegisterLunchReturnAction $action) {}

    public function __invoke(LunchReturnRequest $request, string $id): ResponseEntity
    {
        $attendance = Attendance::where('public_id', $id)->firstOrFail();

        $attendance = ($this->action)($attendance, $request->validated());

        return new ResponseEntity(data: $attendance->toApiArray(), status: 200);
    }
}
