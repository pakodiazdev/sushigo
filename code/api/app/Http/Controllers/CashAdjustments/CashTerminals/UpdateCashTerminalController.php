<?php

namespace App\Http\Controllers\CashAdjustments\CashTerminals;

use App\Http\Controllers\Controller;
use App\Models\CashTerminal;
use App\Http\Requests\CashAdjustments\CashTerminals\UpdateCashTerminalRequest;
use Illuminate\Http\JsonResponse;

/**
 * @OA\Put(
 *   path="/api/v1/cash-terminals/{id}",
 *   summary="Update Cash Terminal",
 *   tags={"Cash Terminals"},
 *   security={{"bearerAuth":{}}},
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer"), description="Cash Terminal ID"),
 *   @OA\RequestBody(
 *     required=true,
 *     @OA\JsonContent(ref="#/components/schemas/UpdateCashTerminalRequest")
 *   ),
 *   @OA\Response(response=200, description="Cash terminal updated successfully"),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden"),
 *   @OA\Response(response=404, description="Cash terminal not found"),
 *   @OA\Response(response=422, description="Validation error")
 * )
 */
class UpdateCashTerminalController extends Controller
{
    public function __invoke(UpdateCashTerminalRequest $request, CashTerminal $cashTerminal): JsonResponse
    {
        $validated = $request->validated();

        $cashTerminal->update($validated);

        return response()->json([
            'message' => 'Cash terminal updated successfully',
            'data' => $cashTerminal->fresh('branch'),
        ]);
    }
}
