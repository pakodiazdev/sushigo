<?php

namespace App\Http\Controllers\CashAdjustments\CashSessions;

use App\Http\Controllers\Controller;
use App\Http\Requests\CashAdjustments\CashSessions\UpdateCashSessionRequest;
use App\Models\CashSession;
use Illuminate\Http\JsonResponse;

/**
 * @OA\Put(
 *   path="/api/v1/cash-sessions/{cashSession}",
 *   summary="Update Cash Session",
 *   tags={"Cash Sessions"},
 *   security={{"bearerAuth":{}}},
 *
 *   @OA\Parameter(name="cashSession", in="path", required=true, @OA\Schema(type="string"), description="Cash Session public_id (ULID)"),
 *
 *   @OA\RequestBody(
 *     required=true,
 *
 *     @OA\JsonContent(ref="#/components/schemas/UpdateCashSessionRequest")
 *   ),
 *
 *   @OA\Response(response=200, description="Cash session updated successfully"),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden - Cannot update posted session"),
 *   @OA\Response(response=404, description="Cash session not found"),
 *   @OA\Response(response=422, description="Validation error")
 * )
 */
class UpdateCashSessionController extends Controller
{
    public function __invoke(UpdateCashSessionRequest $request, CashSession $cashSession): JsonResponse
    {
        $cashSession->update($request->validated());

        return response()->json([
            'message' => 'Cash session updated successfully',
            'data' => $cashSession->fresh('cashRegister.branch'),
        ]);
    }
}
