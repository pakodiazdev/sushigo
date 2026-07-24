<?php

namespace App\Http\Controllers\CashAdjustments\BankAccounts;

use App\Http\Controllers\Controller;
use App\Http\Requests\CashAdjustments\BankAccounts\UpdateBankAccountRequest;
use App\Models\BankAccount;
use Illuminate\Http\JsonResponse;

/**
 * @OA\Put(
 *   path="/api/v1/bank-accounts/{bankAccount}",
 *   summary="Update Bank Account",
 *   tags={"Bank Accounts"},
 *   security={{"bearerAuth":{}}},
 *
 *   @OA\Parameter(name="bankAccount", in="path", required=true, @OA\Schema(type="string"), description="Bank Account public_id (ULID)"),
 *
 *   @OA\RequestBody(
 *     required=true,
 *
 *     @OA\JsonContent(ref="#/components/schemas/UpdateBankAccountRequest")
 *   ),
 *
 *   @OA\Response(response=200, description="Bank account updated successfully"),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden"),
 *   @OA\Response(response=404, description="Bank account not found"),
 *   @OA\Response(response=422, description="Validation error")
 * )
 */
class UpdateBankAccountController extends Controller
{
    public function __invoke(UpdateBankAccountRequest $request, BankAccount $bankAccount): JsonResponse
    {
        $bankAccount->update($request->validated());

        return response()->json([
            'message' => 'Bank account updated successfully',
            'data' => $bankAccount->fresh('branch'),
        ]);
    }
}
