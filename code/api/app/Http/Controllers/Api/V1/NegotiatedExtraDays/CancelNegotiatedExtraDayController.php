<?php

namespace App\Http\Controllers\Api\V1\NegotiatedExtraDays;

use App\Actions\Payroll\EnsurePeriodIsEditableAction;
use App\Enums\EmployeeRequestStatus;
use App\Http\Controllers\Controller;
use App\Models\NegotiatedExtraDay;
use App\Models\User;
use App\Support\Clock\ApplicationClock;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * @OA\Delete(
 *   path="/api/v1/negotiated-extra-days/{id}",
 *   summary="Cancel Negotiated Extra Day",
 *   description="Soft-deletes a future negotiated extra day. Only future dates (>= today) can be cancelled. If the day is linked to an EmployeeRequest, that request is also marked as CANCELLED.",
 *   tags={"NegotiatedExtraDays"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="string"), description="NegotiatedExtraDay public_id (ULID)"),
 *
 *   @OA\Response(response=200, description="Day cancelled", @OA\JsonContent(@OA\Property(property="data", type="null"), @OA\Property(property="status", type="string", example="ok"))),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires employee-requests.cancel or employee-requests.approve"),
 *   @OA\Response(response=404, description="Not Found"),
 *   @OA\Response(response=422, description="Validation Error — date is in the past", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 *
 * @throws ValidationException
 */
class CancelNegotiatedExtraDayController extends Controller
{
    public function __construct(
        private readonly ApplicationClock $clock,
        private readonly EnsurePeriodIsEditableAction $ensurePeriodIsEditable,
    ) {}

    public function __invoke(Request $request, string $id): JsonResponse
    {
        $record = NegotiatedExtraDay::query()->where('public_id', $id)->firstOrFail();

        $user = $request->user();
        assert($user instanceof User);

        $canCancel = $user->hasPermissionTo('employee-requests.cancel')
            || $user->hasPermissionTo('employee-requests.approve');

        if (! $canCancel) {
            throw new AuthorizationException('No tienes permiso para cancelar días extra negociados.');
        }

        $recordDate = $record->date->toDateString();
        $todayInBusinessTz = $this->clock->todayInBusinessTz();

        if ($recordDate < $todayInBusinessTz) {
            throw ValidationException::withMessages([
                'date' => 'No se puede cancelar un día extra que ya ocurrió.',
            ]);
        }

        if (! ($this->ensurePeriodIsEditable)($record->branch_id, $recordDate)) {
            throw ValidationException::withMessages([
                'date' => 'No se puede cancelar un día extra dentro de un periodo de nómina ya cerrado. Reabra el periodo primero.',
            ]);
        }

        DB::transaction(function () use ($record): void {
            // If linked to an EmployeeRequest, mark it as CANCELLED too
            $record->loadMissing('employeeRequest');
            if ($record->employeeRequest !== null) {
                $record->employeeRequest->update([
                    'status' => EmployeeRequestStatus::CANCELLED,
                    'requestable_type' => null,
                    'requestable_id' => null,
                ]);
            }

            $record->delete();
        });

        return response()->json(['data' => null, 'status' => 'ok']);
    }
}
