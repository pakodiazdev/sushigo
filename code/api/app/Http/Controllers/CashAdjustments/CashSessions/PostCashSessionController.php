<?php

namespace App\Http\Controllers\CashAdjustments\CashSessions;

use App\Http\Controllers\Controller;
use App\Models\CashSession;
use App\Services\CashAdjustments\CashSessionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

/**
 * @OA\Post(
 *   path="/api/v1/cash-sessions/{id}/post",
 *   summary="Post Cash Session",
 *   description="Finalizes a cash session by calculating closing balance and changing status to POSTED",
 *   tags={"Cash Sessions"},
 *   security={{"bearerAuth":{}}},
 *
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer"), description="Cash Session ID"),
 *
 *   @OA\Response(response=200, description="Cash session posted successfully"),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden"),
 *   @OA\Response(response=404, description="Cash session not found"),
 *   @OA\Response(response=422, description="Cannot post session - has unposted transactions")
 * )
 */
class PostCashSessionController extends Controller
{
    public function __construct(
        private CashSessionService $sessionService
    ) {}

    public function __invoke(int $id): JsonResponse
    {
        $cashSession = CashSession::findOrFail($id);

        Gate::authorize('post', $cashSession);

        try {
            $postedSession = $this->sessionService->postSession($cashSession);

            return response()->json([
                'message' => 'Cash session posted successfully',
                'data' => $postedSession->load('cashRegister.branch'),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }
}
