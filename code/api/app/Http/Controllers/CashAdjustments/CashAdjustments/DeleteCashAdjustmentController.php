<?php

namespace App\Http\Controllers\CashAdjustments\CashAdjustments;

use App\Http\Controllers\Controller;
use App\Models\CashAdjustment;
use App\Services\CashAdjustments\CashAdjustmentService;
use Illuminate\Http\JsonResponse;

/**
 * @OA\Delete(
 *   path="/api/v1/cash-adjustments/{id}",
 *   summary="Delete Cash Adjustment",
 *   tags={"Cash Adjustments"},
 *   security={{"bearerAuth":{}}},
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer"), description="Cash Adjustment ID"),
 *   @OA\Response(response=200, description="Cash adjustment deleted successfully"),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden"),
 *   @OA\Response(response=404, description="Cash adjustment not found"),
 *   @OA\Response(response=422, description="Cannot delete posted adjustment")
 * )
 */
class DeleteCashAdjustmentController extends Controller
{
    public function __construct(
        private CashAdjustmentService $adjustmentService
    ) {}

    public function __invoke(CashAdjustment $cashAdjustment): JsonResponse
    {
        try {
            $this->adjustmentService->deleteAdjustment($cashAdjustment);

            return response()->json([
                'message' => 'Adjustment deleted successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }
}
