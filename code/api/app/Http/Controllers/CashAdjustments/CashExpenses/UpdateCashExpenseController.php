<?php

namespace App\Http\Controllers\CashAdjustments\CashExpenses;

use App\Http\Controllers\Controller;
use App\Http\Requests\CashAdjustments\CashExpenses\UpdateCashExpenseRequest;
use App\Models\CashExpense;
use App\Services\CashAdjustments\CashExpenseService;
use Illuminate\Http\JsonResponse;

/**
 * @OA\Put(
 *   path="/api/v1/cash-expenses/{id}",
 *   summary="Update Cash Expense",
 *   tags={"Cash Expenses"},
 *   security={{"bearerAuth":{}}},
 *
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer"), description="Cash Expense ID"),
 *
 *   @OA\RequestBody(
 *     required=true,
 *
 *     @OA\JsonContent(ref="#/components/schemas/UpdateCashExpenseRequest")
 *   ),
 *
 *   @OA\Response(response=200, description="Cash expense updated successfully"),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden - Cannot update posted expense"),
 *   @OA\Response(response=404, description="Cash expense not found"),
 *   @OA\Response(response=422, description="Validation error")
 * )
 */
class UpdateCashExpenseController extends Controller
{
    public function __construct(
        private CashExpenseService $expenseService
    ) {}

    public function __invoke(UpdateCashExpenseRequest $request, int $id): JsonResponse
    {
        $cashExpense = CashExpense::findOrFail($id);

        $validated = $request->validated();

        try {
            $updatedExpense = $this->expenseService->updateExpense($cashExpense, $validated);

            return response()->json([
                'message' => 'Expense updated successfully',
                'data' => $updatedExpense->fresh(['cashSession', 'cardTerminal', 'bankAccount']),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }
}
