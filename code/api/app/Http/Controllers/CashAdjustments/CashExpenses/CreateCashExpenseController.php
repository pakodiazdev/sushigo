<?php

namespace App\Http\Controllers\CashAdjustments\CashExpenses;

use App\DataTransferObjects\CashAdjustments\RegisterExpenseData;
use App\Http\Controllers\Controller;
use App\Http\Requests\CashAdjustments\CashExpenses\StoreCashExpenseRequest;
use App\Models\CashSession;
use App\Services\CashAdjustments\CashExpenseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

/**
 * @OA\Post(
 *   path="/api/v1/cash-expenses",
 *   summary="Create Cash Expense",
 *   description="Registers an operational expense paid from cash register",
 *   tags={"Cash Expenses"},
 *   security={{"bearerAuth":{}}},
 *
 *   @OA\RequestBody(
 *     required=true,
 *
 *     @OA\JsonContent(ref="#/components/schemas/StoreCashExpenseRequest")
 *   ),
 *
 *   @OA\Response(response=201, description="Cash expense created successfully"),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden"),
 *   @OA\Response(response=422, description="Validation error")
 * )
 */
class CreateCashExpenseController extends Controller
{
    public function __construct(
        private CashExpenseService $expenseService
    ) {}

    public function __invoke(StoreCashExpenseRequest $request): JsonResponse
    {
        $validated = $request->validated();

        try {
            $session = CashSession::findOrFail($validated['cash_session_id']);

            $expense = $this->expenseService->registerExpense(new RegisterExpenseData(
                session: $session,
                tenderType: $validated['tender_type'],
                amount: $validated['amount'],
                category: $validated['category'],
                vendor: $validated['vendor'] ?? null,
                reference: $validated['reference'] ?? null,
                notes: $validated['notes'] ?? null,
                cardTerminalId: $validated['card_terminal_id'] ?? null,
                bankAccountId: $validated['bank_account_id'] ?? null,
                createdBy: Auth::user(),
                incurredAt: $validated['incurred_at'] ?? null,
                meta: $validated['meta'] ?? []
            ));

            return response()->json([
                'message' => 'Expense created successfully',
                'data' => $expense->load(['cashSession', 'cardTerminal', 'bankAccount']),
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }
}
