<?php

namespace App\Http\Controllers\CashAdjustments\CashExpenses;

use App\Http\Controllers\Controller;
use App\Models\CashExpense;
use App\Services\CashAdjustments\CashExpenseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

/**
 * @OA\Delete(
 *   path="/api/v1/cash-expenses/{cashExpense}",
 *   summary="Delete Cash Expense",
 *   tags={"Cash Expenses"},
 *   security={{"bearerAuth":{}}},
 *
 *   @OA\Parameter(name="cashExpense", in="path", required=true, @OA\Schema(type="string"), description="Cash Expense public_id (ULID)"),
 *
 *   @OA\Response(response=200, description="Cash expense deleted successfully"),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden"),
 *   @OA\Response(response=404, description="Cash expense not found"),
 *   @OA\Response(response=422, description="Cannot delete posted expense")
 * )
 */
class DeleteCashExpenseController extends Controller
{
    public function __construct(
        private CashExpenseService $expenseService
    ) {}

    public function __invoke(CashExpense $cashExpense): JsonResponse
    {
        Gate::authorize('delete', $cashExpense);

        try {
            $this->expenseService->deleteExpense($cashExpense);

            return response()->json([
                'message' => 'Expense deleted successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }
}
