<?php

namespace App\Http\Controllers\CashAdjustments\CashSessions;

use App\Http\Controllers\Controller;
use App\Models\CashSession;
use App\Services\CashAdjustments\CashSessionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

/**
 * @OA\Get(
 *   path="/api/v1/cash-sessions/{cashSession}/summary",
 *   summary="Get Cash Session Summary",
 *   description="Returns detailed summary with income/expense breakdown by tender type",
 *   tags={"Cash Sessions"},
 *   security={{"bearerAuth":{}}},
 *
 *   @OA\Parameter(name="cashSession", in="path", required=true, @OA\Schema(type="string"), description="Cash Session public_id (ULID)"),
 *
 *   @OA\Response(response=200, description="Session summary retrieved successfully"),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden"),
 *   @OA\Response(response=404, description="Cash session not found")
 * )
 */
class GetSessionSummaryController extends Controller
{
    public function __construct(
        private CashSessionService $sessionService
    ) {}

    public function __invoke(CashSession $cashSession): JsonResponse
    {
        Gate::authorize('view', $cashSession);

        $summary = $this->sessionService->getSessionSummary($cashSession);

        return response()->json([
            'data' => $summary,
        ]);
    }
}
