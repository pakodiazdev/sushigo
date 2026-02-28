<?php

namespace App\Http\Controllers\CashAdjustments\CashAdjustments;

use App\Http\Controllers\Controller;
use App\Models\CashAdjustment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @OA\Get(
 *   path="/api/v1/cash-adjustments",
 *   summary="List Cash Adjustments",
 *   tags={"Cash Adjustments"},
 *   security={{"bearerAuth":{}}},
 *
 *   @OA\Parameter(name="cash_session_id", in="query", @OA\Schema(type="integer"), description="Filter by cash session ID"),
 *   @OA\Parameter(name="type", in="query", @OA\Schema(type="string", enum={"EXTERNAL_IMPORT", "CORRECTION"}), description="Filter by adjustment type"),
 *   @OA\Parameter(name="direction", in="query", @OA\Schema(type="string", enum={"INFLOW", "OUTFLOW"}), description="Filter by direction"),
 *   @OA\Parameter(name="posted", in="query", @OA\Schema(type="boolean"), description="Filter by posted status"),
 *   @OA\Parameter(name="per_page", in="query", @OA\Schema(type="integer", default=15), description="Items per page"),
 *
 *   @OA\Response(response=200, description="Cash adjustments retrieved successfully"),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden")
 * )
 */
class ListCashAdjustmentsController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $query = CashAdjustment::with(['cashSession.cashRegister', 'lines', 'postedBy']);

        if ($request->has('cash_session_id')) {
            $query->where('cash_session_id', $request->input('cash_session_id'));
        }

        if ($request->has('type')) {
            $query->byType($request->input('type'));
        }

        if ($request->has('direction')) {
            $query->byDirection($request->input('direction'));
        }

        if ($request->has('status')) {
            if ($request->input('status') === 'POSTED') {
                $query->posted();
            } elseif ($request->input('status') === 'DRAFT') {
                $query->draft();
            }
        }

        $sortBy = $request->input('sort_by', 'created_at');
        $sortOrder = $request->input('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        $perPage = $request->input('per_page', 15);
        $adjustments = $query->paginate($perPage);

        return response()->json($adjustments);
    }
}
