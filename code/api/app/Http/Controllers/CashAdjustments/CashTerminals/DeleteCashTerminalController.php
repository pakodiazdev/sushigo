<?php

namespace App\Http\Controllers\CashAdjustments\CashTerminals;

use App\Http\Controllers\Controller;
use App\Models\CashTerminal;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

/**
 * @OA\Delete(
 *   path="/api/v1/cash-terminals/{id}",
 *   summary="Delete Cash Terminal",
 *   tags={"Cash Terminals"},
 *   security={{"bearerAuth":{}}},
 *
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer"), description="Cash Terminal ID"),
 *
 *   @OA\Response(response=200, description="Cash terminal deleted successfully"),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden"),
 *   @OA\Response(response=404, description="Cash terminal not found"),
 *   @OA\Response(response=422, description="Cannot delete terminal with existing transactions")
 * )
 */
class DeleteCashTerminalController extends Controller
{
    public function __invoke(int $id): JsonResponse
    {
        $cashTerminal = CashTerminal::findOrFail($id);

        Gate::authorize('delete', $cashTerminal);

        if ($cashTerminal->adjustmentLines()->exists() || $cashTerminal->expenses()->exists()) {
            return response()->json([
                'message' => 'Cannot delete terminal with existing transactions',
            ], 422);
        }

        $cashTerminal->delete();

        return response()->json([
            'message' => 'Cash terminal deleted successfully',
        ]);
    }
}
