<?php

namespace App\Http\Controllers\Api\V1\Attendances;

use App\Actions\Attendances\ResolveOvertimeValuationAction;
use App\Enums\OvertimeValuationMethod;
use App\Http\Controllers\Controller;
use App\Http\Requests\Attendances\PreviewOvertimeValuationRequest;
use App\Http\Responses\Common\ResponseEntity;
use App\Models\Attendance;

/**
 * GET /api/v1/attendances/{id}/overtime-preview
 *
 * Read-only preview of the amount that would be paid for a given valuation
 * method — used by the decision dialog to show a live estimate before
 * confirming. Nothing is persisted.
 *
 * @OA\Get(
 *     path="/api/v1/attendances/{id}/overtime-preview",
 *     summary="Preview overtime valuation amount",
 *     tags={"Attendances"},
 *     security={{"passport":{}}},
 *
 *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="string")),
 *     @OA\Parameter(name="valuation_method", in="query", required=true, @OA\Schema(type="string", enum={"LFT_PROPORTIONAL", "AGREED_RATE", "SALARY_FACTOR"})),
 *     @OA\Parameter(name="agreed_rate", in="query", @OA\Schema(type="number", format="float")),
 *     @OA\Parameter(name="agreed_factor", in="query", @OA\Schema(type="number", format="float")),
 *
 *     @OA\Response(response=200, description="Preview computed"),
 *     @OA\Response(response=404, description="Attendance not found"),
 *     @OA\Response(response=422, description="No overtime, missing fields, or no LFT tier configured")
 * )
 */
class PreviewOvertimeValuationController extends Controller
{
    public function __invoke(
        PreviewOvertimeValuationRequest $request,
        string $id,
        ResolveOvertimeValuationAction $resolveValuation,
    ): ResponseEntity {
        $attendance = Attendance::where('public_id', $id)->firstOrFail();

        $method = OvertimeValuationMethod::from($request->validated('valuation_method'));

        $resolved = $resolveValuation(
            $attendance,
            $method,
            $request->agreed_rate !== null ? (float) $request->agreed_rate : null,
            $request->agreed_factor !== null ? (float) $request->agreed_factor : null,
        );

        return new ResponseEntity(data: [
            'valuation_method' => $method->value,
            'rate_applied' => $resolved['rate_applied'],
            'amount' => $resolved['amount'],
            'accumulated_hours' => $resolved['accumulated_hours'],
        ]);
    }
}
