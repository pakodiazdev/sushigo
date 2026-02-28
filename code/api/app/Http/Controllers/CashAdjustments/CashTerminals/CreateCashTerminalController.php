<?php

namespace App\Http\Controllers\CashAdjustments\CashTerminals;

use App\Http\Controllers\Controller;
use App\Http\Requests\CashAdjustments\CashTerminals\StoreCashTerminalRequest;
use App\Models\CashTerminal;
use Illuminate\Http\JsonResponse;

/**
 * @OA\Post(
 *   path="/api/v1/cash-terminals",
 *   summary="Create Cash Terminal",
 *   tags={"Cash Terminals"},
 *   security={{"bearerAuth":{}}},
 *
 *   @OA\RequestBody(
 *     required=true,
 *
 *     @OA\JsonContent(ref="#/components/schemas/StoreCashTerminalRequest")
 *   ),
 *
 *   @OA\Response(response=201, description="Cash terminal created successfully"),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden"),
 *   @OA\Response(response=422, description="Validation error")
 * )
 */
class CreateCashTerminalController extends Controller
{
    public function __invoke(StoreCashTerminalRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $terminal = CashTerminal::create($validated);

        return response()->json([
            'message' => 'Cash terminal created successfully',
            'data' => $terminal->load('branch'),
        ], 201);
    }
}
