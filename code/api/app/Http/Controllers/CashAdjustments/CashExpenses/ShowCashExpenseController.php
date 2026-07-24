<?php

namespace App\Http\Controllers\CashAdjustments\CashExpenses;

use App\Http\Controllers\Controller;
use App\Models\CashExpense;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

/**
 * @OA\Get(
 *   path="/api/v1/cash-expenses/{cashExpense}",
 *   summary="Show Cash Expense",
 *   tags={"Cash Expenses"},
 *   security={{"bearerAuth":{}}},
 *
 *   @OA\Parameter(name="cashExpense", in="path", required=true, @OA\Schema(type="string"), description="Cash Expense public_id (ULID)"),
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
        Gate::authorize('view', $cashExpense);

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
