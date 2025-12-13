<?php

namespace App\Http\Controllers\CashAdjustments\BankAccounts;

use App\Http\Controllers\Controller;
use App\Models\BankAccount;
use App\Http\Requests\CashAdjustments\BankAccounts\StoreBankAccountRequest;
use Illuminate\Http\JsonResponse;

/**
 * @OA\Post(
 *   path="/api/v1/bank-accounts",
 *   summary="Create Bank Account",
 *   tags={"Bank Accounts"},
 *   security={{"bearerAuth":{}}},
 *   @OA\RequestBody(
 *     required=true,
 *     @OA\JsonContent(ref="#/components/schemas/StoreBankAccountRequest")
 *   ),
 *   @OA\Response(response=201, description="Bank account created successfully"),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden"),
 *   @OA\Response(response=422, description="Validation error")
 * )
 */
class CreateBankAccountController extends Controller
{
    public function __invoke(StoreBankAccountRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $account = BankAccount::create($validated);

        return response()->json([
            'message' => 'Bank account created successfully',
            'data' => $account->load('branch'),
        ], 201);
    }
}
