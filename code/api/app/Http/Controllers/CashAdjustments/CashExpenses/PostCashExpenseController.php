<?php

namespace App\Http\Controllers\CashAdjustments\CashExpenses;

use App\Http\Controllers\Controller;
use App\Models\CashExpense;
use App\Services\CashAdjustments\CashExpenseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;

/**
 * @OA\Post(
 *   path="/api/v1/cash-expenses/{cashExpense}/post",
 *   summary="Post Cash Expense",
 *   description="Finalizes expense and marks it as posted",
 *   tags={"Cash Expenses"},
 *   security={{"bearerAuth":{}}},
 *
 *   @OA\Parameter(name="cashExpense", in="path", required=true, @OA\Schema(type="string"), description="Cash Expense public_id (ULID)"),
 *
 *   @OA\Response(response=200, description="Cash expense posted successfully"),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden"),
 *   @OA\Response(response=404, description="Cash expense not found"),
 *   @OA\Response(response=422, description="Expense already posted")
 * )
 */
class PostCashExpenseController extends Controller
{
    public function __construct(
        private CashExpenseService $expenseService
    ) {}

    public function __invoke(CashExpense $cashExpense): JsonResponse
    {
        Gate::authorize('post', $cashExpense);

        try {
            $postedExpense = $this->expenseService->postExpense(
                $cashExpense,
                Auth::user()
            );

            return response()->json([
                'message' => 'Expense posted successfully',
                'data' => $postedExpense->load(['cashSession', 'cardTerminal', 'bankAccount', 'postedBy']),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }
}
