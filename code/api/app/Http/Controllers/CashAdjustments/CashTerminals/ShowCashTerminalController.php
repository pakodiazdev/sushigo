<?php

namespace App\Http\Controllers\CashAdjustments\CashTerminals;

use App\Http\Controllers\Controller;
use App\Models\CashTerminal;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

/**
 * @OA\Get(
 *   path="/api/v1/cash-terminals/{cashTerminal}",
 *   summary="Show Cash Terminal",
 *   tags={"Cash Terminals"},
 *   security={{"bearerAuth":{}}},
 *
 *   @OA\Parameter(name="cashTerminal", in="path", required=true, @OA\Schema(type="string"), description="Cash Terminal public_id (ULID)"),
 *
 *   @OA\Response(response=200, description="Cash terminal retrieved successfully"),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden"),
 *   @OA\Response(response=404, description="Cash terminal not found")
 * )
 */
class ShowCashTerminalController extends Controller
{
    public function __invoke(CashTerminal $cashTerminal): JsonResponse
    {
        Gate::authorize('view', $cashTerminal);

        $cashTerminal->load('branch');

        return response()->json([
            'data' => $cashTerminal,
        ]);
    }
}
