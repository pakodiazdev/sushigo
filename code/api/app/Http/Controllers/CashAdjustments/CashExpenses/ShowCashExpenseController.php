<?php

namespace App\Http\Controllers\CashAdjustments\CashExpenses;

use App\Http\Controllers\Controller;
use App\Models\CashExpense;
use Illuminate\Http\JsonResponse;

/**
 * @OA\Get(
 *   path="/api/v1/cash-expenses/{id}",
 *   summary="Show Cash Expense",
 *   tags={"Cash Expenses"},
 *   security={{"bearerAuth":{}}},
 *
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer"), description="Cash Expense ID"),
 *
 *   @OA\Response(response=200, description="Cash expense retrieved successfully"),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden"),
 *   @OA\Response(response=404, description="Cash expense not found")
 * )
 */
class ShowCashExpenseController extends Controller
{
    public function __invoke(CashExpense $cashExpense): JsonResponse
    {
        $cashExpense->load([
            'cashSession.cashRegister',
            'cardTerminal',
            'bankAccount',
            'createdBy',
            'postedBy',
        ]);

        return response()->json([
            'data' => $cashExpense,
        ]);
    }
}
