<?php

namespace App\Http\Controllers\CashAdjustments\CashRegisters;

use App\Http\Controllers\Controller;
use App\Models\CashRegister;
use App\Http\Requests\CashAdjustments\CashRegisters\StoreCashRegisterRequest;
use Illuminate\Http\JsonResponse;

/**
 * @OA\Post(
 *   path="/api/v1/cash-registers",
 *   summary="Create Cash Register",
 *   tags={"Cash Registers"},
 *   security={{"bearerAuth":{}}},
 *   @OA\RequestBody(
 *     required=true,
 *     @OA\JsonContent(ref="#/components/schemas/StoreCashRegisterRequest")
 *   ),
 *   @OA\Response(response=201, description="Cash register created successfully"),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden"),
 *   @OA\Response(response=422, description="Validation error")
 * )
 */
class CreateCashRegisterController extends Controller
{
    public function __invoke(StoreCashRegisterRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $register = CashRegister::create($validated);

        return response()->json([
            'message' => 'Cash register created successfully',
            'data' => $register->load(['branch', 'operatingUnit']),
        ], 201);
    }
}
