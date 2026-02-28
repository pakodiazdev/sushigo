<?php

namespace App\Http\Controllers\CashAdjustments\CashSessions;

use App\Http\Controllers\Controller;
use App\Models\CashSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @OA\Get(
 *   path="/api/v1/cash-sessions",
 *   summary="List Cash Sessions",
 *   tags={"Cash Sessions"},
 *   security={{"bearerAuth":{}}},
 *
 *   @OA\Parameter(name="cash_register_id", in="query", @OA\Schema(type="integer"), description="Filter by cash register ID"),
 *   @OA\Parameter(name="operating_date_from", in="query", @OA\Schema(type="string", format="date"), description="Filter from date (YYYY-MM-DD)"),
 *   @OA\Parameter(name="operating_date_to", in="query", @OA\Schema(type="string", format="date"), description="Filter to date (YYYY-MM-DD)"),
 *   @OA\Parameter(name="status", in="query", @OA\Schema(type="string", enum={"DRAFT", "POSTED"}), description="Filter by status"),
 *   @OA\Parameter(name="per_page", in="query", @OA\Schema(type="integer", default=15), description="Items per page"),
 *
 *   @OA\Response(response=200, description="Cash sessions retrieved successfully"),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden")
 * )
 */
class ListCashSessionsController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $query = CashSession::with(['cashRegister.branch']);

        if ($request->has('cash_register_id')) {
            $query->byRegister($request->input('cash_register_id'));
        }

        if ($request->has('status')) {
            if ($request->input('status') === 'DRAFT') {
                $query->draft();
            } elseif ($request->input('status') === 'POSTED') {
                $query->posted();
            }
        }

        if ($request->has('date')) {
            $query->byDate($request->input('date'));
        }

        if ($request->has('date_from') && $request->has('date_to')) {
            $query->byDateRange($request->input('date_from'), $request->input('date_to'));
        }

        $sortBy = $request->input('sort_by', 'operating_date');
        $sortOrder = $request->input('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        $perPage = $request->input('per_page', 15);
        $sessions = $query->paginate($perPage);

        // Add calculated current_balance to each session
        $sessions->getCollection()->transform(function ($session) {
            $session->current_balance = number_format($session->calculateCurrentBalance(), 2, '.', '');

            return $session;
        });

        return response()->json($sessions);
    }
}
