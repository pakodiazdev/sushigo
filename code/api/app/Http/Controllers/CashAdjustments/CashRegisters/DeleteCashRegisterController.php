<?php

namespace App\Http\Controllers\CashAdjustments\CashRegisters;

use App\Http\Controllers\Controller;
use App\Models\CashRegister;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

/**
 * @OA\Delete(
 *   path="/api/v1/cash-registers/{cashRegister}",
 *   summary="Delete Cash Register",
 *   tags={"Cash Registers"},
 *   security={{"bearerAuth":{}}},
 *
 *   @OA\Parameter(name="cashRegister", in="path", required=true, @OA\Schema(type="string"), description="Cash Register public_id (ULID)"),
 *
 *   @OA\Response(response=200, description="Cash register deleted successfully"),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden"),
 *   @OA\Response(response=404, description="Cash register not found"),
 *   @OA\Response(response=422, description="Cannot delete register with existing sessions")
 * )
 */
class DeleteCashRegisterController extends Controller
{
    public function __invoke(CashRegister $cashRegister): JsonResponse
    {
        Gate::authorize('delete', $cashRegister);

        // Check if register has sessions
        if ($cashRegister->sessions()->exists()) {
            return response()->json([
                'message' => 'Cannot delete cash register with existing sessions',
            ], 422);
        }

        $cashRegister->delete();

        return response()->json([
            'message' => 'Cash register deleted successfully',
        ]);
    }
}
