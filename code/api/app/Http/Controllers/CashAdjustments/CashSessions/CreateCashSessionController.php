<?php

namespace App\Http\Controllers\CashAdjustments\CashSessions;

use App\Http\Controllers\Controller;
use App\Http\Requests\CashAdjustments\CashSessions\StoreCashSessionRequest;
use App\Services\CashAdjustments\CashSessionService;
use Illuminate\Http\JsonResponse;

/**
 * @OA\Post(
 *   path="/api/v1/cash-sessions",
 *   summary="Open Cash Session",
 *   tags={"Cash Sessions"},
 *   security={{"bearerAuth":{}}},
 *
 *   @OA\RequestBody(
 *     required=true,
 *
 *     @OA\JsonContent(ref="#/components/schemas/StoreCashSessionRequest")
 *   ),
 *
 *   @OA\Response(response=201, description="Cash session opened successfully"),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden"),
 *   @OA\Response(response=422, description="Validation error or session already exists")
 * )
 */
class CreateCashSessionController extends Controller
{
    public function __construct(
        private CashSessionService $sessionService
    ) {}

    public function __invoke(StoreCashSessionRequest $request): JsonResponse
    {
        $validated = $request->validated();

        try {
            $cashRegister = $request->cashRegister();

            $session = $this->sessionService->openSession(
                cashRegister: $cashRegister,
                operatingDate: $validated['operating_date'],
                openingBalance: $validated['opening_balance'] ?? null,
                meta: $validated['meta'] ?? []
            );

            return response()->json([
                'message' => 'Cash session created successfully',
                'data' => $session->load('cashRegister.branch'),
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }
}
