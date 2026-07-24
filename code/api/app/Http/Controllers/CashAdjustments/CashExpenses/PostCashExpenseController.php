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
 *   path="/api/v1/cash-expenses/{id}/post",
 *   summary="Post Cash Expense",
 *   description="Finalizes expense and marks it as posted",
 *   tags={"Cash Expenses"},
 *   security={{"bearerAuth":{}}},
 *
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer"), description="Cash Expense ID"),
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

    public function __invoke(int $id): JsonResponse
    {
        $cashExpense = CashExpense::findOrFail($id);

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
