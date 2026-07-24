<?php

namespace App\Http\Controllers\CashAdjustments\CashAdjustments;

use App\Http\Controllers\Controller;
use App\Models\CashAdjustment;
use App\Services\CashAdjustments\CashAdjustmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;

/**
 * @OA\Post(
 *   path="/api/v1/cash-adjustments/{id}/post",
 *   summary="Post Cash Adjustment",
 *   description="Finalizes adjustment and marks it as posted",
 *   tags={"Cash Adjustments"},
 *   security={{"bearerAuth":{}}},
 *
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer"), description="Cash Adjustment ID"),
 *
 *   @OA\Response(response=200, description="Cash adjustment posted successfully"),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden"),
 *   @OA\Response(response=404, description="Cash adjustment not found"),
 *   @OA\Response(response=422, description="Adjustment already posted")
 * )
 */
class PostCashAdjustmentController extends Controller
{
    public function __construct(
        private CashAdjustmentService $adjustmentService
    ) {}

    public function __invoke(int $id): JsonResponse
    {
        $cashAdjustment = CashAdjustment::findOrFail($id);

        Gate::authorize('post', $cashAdjustment);

        try {
            $postedAdjustment = $this->adjustmentService->postAdjustment(
                $cashAdjustment,
                Auth::user()
            );

            return response()->json([
                'message' => 'Adjustment posted successfully',
                'data' => $postedAdjustment->load(['cashSession', 'lines', 'postedBy']),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }
}
