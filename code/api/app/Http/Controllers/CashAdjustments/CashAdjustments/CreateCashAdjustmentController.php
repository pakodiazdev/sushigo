<?php

namespace App\Http\Controllers\CashAdjustments\CashAdjustments;

use App\Http\Controllers\Controller;
use App\Http\Requests\CashAdjustments\CashAdjustments\StoreCashAdjustmentRequest;
use App\Models\CashSession;
use App\Services\CashAdjustments\CashAdjustmentService;
use Illuminate\Http\JsonResponse;

/**
 * @OA\Post(
 *   path="/api/v1/cash-adjustments",
 *   summary="Create Cash Adjustment",
 *   description="Creates income/expense adjustment with multiple tender type lines",
 *   tags={"Cash Adjustments"},
 *   security={{"bearerAuth":{}}},
 *
 *   @OA\RequestBody(
 *     required=true,
 *
 *     @OA\JsonContent(ref="#/components/schemas/StoreCashAdjustmentRequest")
 *   ),
 *
 *   @OA\Response(response=201, description="Cash adjustment created successfully"),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden"),
 *   @OA\Response(response=422, description="Validation error")
 * )
 */
class CreateCashAdjustmentController extends Controller
{
    public function __construct(
        private CashAdjustmentService $adjustmentService
    ) {}

    public function __invoke(StoreCashAdjustmentRequest $request): JsonResponse
    {
        $validated = $request->validated();

        try {
            $session = CashSession::findOrFail($validated['cash_session_id']);

            $adjustment = $this->adjustmentService->createAdjustment(
                session: $session,
                type: $validated['type'],
                direction: $validated['direction'],
                lines: $validated['lines'],
                sourceSystem: $validated['source_system'] ?? null,
                notes: $validated['notes'] ?? null,
                meta: $validated['meta'] ?? []
            );

            return response()->json([
                'message' => 'Adjustment created successfully',
                'data' => $adjustment->load(['cashSession', 'lines']),
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }
}
