<?php

namespace App\Http\Controllers\CashAdjustments\BankAccounts;

use App\Http\Controllers\Controller;
use App\Models\BankAccount;
use Illuminate\Http\JsonResponse;

/**
 * @OA\Get(
 *   path="/api/v1/bank-accounts/{id}",
 *   summary="Show Bank Account",
 *   tags={"Bank Accounts"},
 *   security={{"bearerAuth":{}}},
 *
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer"), description="Bank Account ID"),
 *
 *   @OA\Response(response=200, description="Bank account retrieved successfully"),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden"),
 *   @OA\Response(response=404, description="Bank account not found")
 * )
 */
class ShowBankAccountController extends Controller
{
    public function __invoke(BankAccount $bankAccount): JsonResponse
    {
        $bankAccount->load('branch');

        return response()->json([
            'data' => $bankAccount,
        ]);
    }
}
