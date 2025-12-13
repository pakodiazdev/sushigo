<?php

namespace App\Http\Controllers\CashAdjustments\BankAccounts;

use App\Http\Controllers\Controller;
use App\Models\BankAccount;
use Illuminate\Http\JsonResponse;

/**
 * @OA\Delete(
 *   path="/api/v1/bank-accounts/{id}",
 *   summary="Delete Bank Account",
 *   tags={"Bank Accounts"},
 *   security={{"bearerAuth":{}}},
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer"), description="Bank Account ID"),
 *   @OA\Response(response=200, description="Bank account deleted successfully"),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden"),
 *   @OA\Response(response=404, description="Bank account not found"),
 *   @OA\Response(response=422, description="Cannot delete account with existing transactions")
 * )
 */
class DeleteBankAccountController extends Controller
{
    public function __invoke(BankAccount $bankAccount): JsonResponse
    {
        if ($bankAccount->adjustmentLines()->exists() || $bankAccount->expenses()->exists()) {
            return response()->json([
                'message' => 'Cannot delete bank account with existing transactions',
            ], 422);
        }

        $bankAccount->delete();

        return response()->json([
            'message' => 'Bank account deleted successfully',
        ]);
    }
}
