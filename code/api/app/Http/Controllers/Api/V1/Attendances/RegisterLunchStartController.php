<?php

namespace App\Http\Controllers\Api\V1\Attendances;

use App\Actions\Attendances\RegisterLunchStartAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Attendances\LunchStartRequest;
use App\Http\Resources\Attendance\AttendanceResource;
use App\Models\Attendance;

/**
 * PATCH /api/v1/attendances/{id}/lunch-start
 *
 * Register the moment an employee exits for their lunch break.
 *
 * @OA\Patch(
 *     path="/api/v1/attendances/{id}/lunch-start",
 *     summary="Register lunch-start",
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
 *         @OA\JsonContent(ref="#/components/schemas/LunchStartRequest")
 *     ),
 *
 *     @OA\Response(
 *         response=200,
 *         description="Lunch start registered",
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
 *     @OA\Response(response=422, description="Validation or business rule error"),
 *     @OA\Response(response=401, description="Unauthenticated")
 * )
 */
class RegisterLunchStartController extends Controller
{
    public function __construct(private readonly RegisterLunchStartAction $action) {}

    public function __invoke(LunchStartRequest $request, string $id): AttendanceResource
    {
        $attendance = Attendance::where('public_id', $id)->firstOrFail();

        $attendance = ($this->action)($attendance, $request->validated());

        return new AttendanceResource($attendance);
    }
}
