<?php

namespace App\Http\Controllers\CashAdjustments\CashRegisters;

use App\Http\Controllers\Controller;
use App\Models\CashRegister;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

/**
 * @OA\Get(
 *   path="/api/v1/cash-registers/{id}",
 *   summary="Show Cash Register",
 *   tags={"Cash Registers"},
 *   security={{"bearerAuth":{}}},
 *
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer"), description="Cash Register ID"),
 *
 *   @OA\Response(response=200, description="Cash register retrieved successfully"),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden"),
 *   @OA\Response(response=404, description="Cash register not found")
 * )
 */
class ShowCashRegisterController extends Controller
{
    public function __invoke(int $id): JsonResponse
    {
        $cashRegister = CashRegister::findOrFail($id);

        Gate::authorize('view', $cashRegister);

        $cashRegister->load(['branch', 'operatingUnit', 'sessions' => function ($query) {
            $query->latest('operating_date')->limit(5);
        }]);

        return response()->json([
            'data' => $cashRegister,
        ]);
    }
}
