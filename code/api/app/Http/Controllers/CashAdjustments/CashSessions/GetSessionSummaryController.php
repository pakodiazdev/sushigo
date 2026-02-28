<?php

namespace App\Http\Controllers\CashAdjustments\CashSessions;

use App\Http\Controllers\Controller;
use App\Models\CashSession;
use App\Services\CashAdjustments\CashSessionService;
use Illuminate\Http\JsonResponse;

/**
 * @OA\Get(
 *   path="/api/v1/cash-sessions/{id}/summary",
 *   summary="Get Cash Session Summary",
 *   description="Returns detailed summary with income/expense breakdown by tender type",
 *   tags={"Cash Sessions"},
 *   security={{"bearerAuth":{}}},
 *
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer"), description="Cash Session ID"),
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
        $summary = $this->sessionService->getSessionSummary($cashSession);

        return response()->json([
            'data' => $summary,
        ]);
    }
}
