<?php

namespace App\Http\Controllers\CashAdjustments\CashSessions;

use App\Http\Controllers\Controller;
use App\Models\CashSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

/**
 * @OA\Get(
 *   path="/api/v1/cash-sessions/{cashSession}",
 *   summary="Show Cash Session",
 *   tags={"Cash Sessions"},
 *   security={{"bearerAuth":{}}},
 *
 *   @OA\Parameter(name="cashSession", in="path", required=true, @OA\Schema(type="string"), description="Cash Session public_id (ULID)"),
 *
 *   @OA\Response(response=200, description="Cash session retrieved successfully"),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden"),
 *   @OA\Response(response=404, description="Cash session not found")
 * )
 */
class ShowCashSessionController extends Controller
{
    public function __invoke(CashSession $cashSession): JsonResponse
    {
        Gate::authorize('view', $cashSession);

        $cashSession->load([
            'cashRegister.branch',
            'adjustments.lines',
            'expenses',
        ]);

        return response()->json([
            'data' => $cashSession,
        ]);
    }
}
