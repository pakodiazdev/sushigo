<?php

namespace App\Http\Controllers\CashAdjustments\CashAdjustments;

use App\Http\Controllers\Controller;
use App\Models\CashAdjustment;
use Illuminate\Http\JsonResponse;

/**
 * @OA\Get(
 *   path="/api/v1/cash-adjustments/{id}",
 *   summary="Show Cash Adjustment",
 *   tags={"Cash Adjustments"},
 *   security={{"bearerAuth":{}}},
 *
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer"), description="Cash Adjustment ID"),
 *
 *   @OA\Response(response=200, description="Cash adjustment retrieved successfully"),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden"),
 *   @OA\Response(response=404, description="Cash adjustment not found")
 * )
 */
class ShowCashAdjustmentController extends Controller
{
    public function __invoke(CashAdjustment $cashAdjustment): JsonResponse
    {
        $cashAdjustment->load([
            'cashSession.cashRegister',
            'lines.cardTerminal',
            'lines.bankAccount',
            'postedBy',
        ]);

        return response()->json([
            'data' => $cashAdjustment,
        ]);
    }
}
