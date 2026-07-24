<?php

namespace App\Http\Controllers\CashAdjustments\CashRegisters;

use App\Http\Controllers\Controller;
use App\Http\Requests\CashAdjustments\CashRegisters\UpdateCashRegisterRequest;
use App\Models\CashRegister;
use Illuminate\Http\JsonResponse;

/**
 * @OA\Put(
 *   path="/api/v1/cash-registers/{id}",
 *   summary="Update Cash Register",
 *   tags={"Cash Registers"},
 *   security={{"bearerAuth":{}}},
 *
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer"), description="Cash Register ID"),
 *
 *   @OA\RequestBody(
 *     required=true,
 *
 *     @OA\JsonContent(ref="#/components/schemas/UpdateCashRegisterRequest")
 *   ),
 *
 *   @OA\Response(response=200, description="Cash register updated successfully"),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden"),
 *   @OA\Response(response=404, description="Cash register not found"),
 *   @OA\Response(response=422, description="Validation error")
 * )
 */
class UpdateCashRegisterController extends Controller
{
    public function __invoke(UpdateCashRegisterRequest $request, int $id): JsonResponse
    {
        $cashRegister = CashRegister::findOrFail($id);

        $cashRegister->update($request->validated());

        return response()->json([
            'message' => 'Cash register updated successfully',
            'data' => $cashRegister->fresh(['branch', 'operatingUnit']),
        ]);
    }
}
