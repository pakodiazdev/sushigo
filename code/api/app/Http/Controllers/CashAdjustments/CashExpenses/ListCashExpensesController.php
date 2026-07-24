<?php

namespace App\Http\Controllers\CashAdjustments\CashExpenses;

use App\Http\Controllers\Concerns\ResolvesPublicIdFilters;
use App\Http\Controllers\Controller;
use App\Models\CashExpense;
use App\Models\CashSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @OA\Get(
 *   path="/api/v1/cash-expenses",
 *   summary="List Cash Expenses",
 *   tags={"Cash Expenses"},
 *   security={{"bearerAuth":{}}},
 *
 *   @OA\Parameter(name="cash_session_id", in="query", @OA\Schema(type="string"), description="Filter by Cash Session public_id (ULID)"),
 *   @OA\Parameter(name="category", in="query", @OA\Schema(type="string"), description="Filter by expense category"),
 *   @OA\Parameter(name="tender_type", in="query", @OA\Schema(type="string", enum={"CASH", "CARD", "TRANSFER"}), description="Filter by tender type"),
 *   @OA\Parameter(name="incurred_from", in="query", @OA\Schema(type="string", format="date-time"), description="Filter from date"),
 *   @OA\Parameter(name="incurred_to", in="query", @OA\Schema(type="string", format="date-time"), description="Filter to date"),
 *   @OA\Parameter(name="per_page", in="query", @OA\Schema(type="integer", default=15), description="Items per page"),
 *
 *   @OA\Response(response=200, description="Cash expenses retrieved successfully"),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden")
 * )
 */
class ListCashExpensesController extends Controller
{
    use ResolvesPublicIdFilters;

    public function __invoke(Request $request): JsonResponse
    {
        $query = CashExpense::with([
            'cashSession.cashRegister',
            'cardTerminal',
            'bankAccount',
            'createdBy',
            'postedBy',
        ]);

        if ($request->has('cash_session_id')) {
            $query->where(
                'cash_session_id',
                $this->resolvePublicIdFilter(CashSession::class, $request->input('cash_session_id'))
            );
        }

        if ($request->has('category')) {
            $query->byCategory($request->input('category'));
        }

        if ($request->has('tender_type')) {
            $query->byTenderType($request->input('tender_type'));
        }

        if ($request->has('status')) {
            if ($request->input('status') === 'POSTED') {
                $query->posted();
            } elseif ($request->input('status') === 'DRAFT') {
                $query->draft();
            }
        }

        if ($request->has('date_from') && $request->has('date_to')) {
            $query->byDateRange($request->input('date_from'), $request->input('date_to'));
        }

        $sortBy = $request->input('sort_by', 'incurred_at');
        $sortOrder = $request->input('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        $perPage = $request->input('per_page', 15);
        $expenses = $query->paginate($perPage);

        return response()->json($expenses);
    }
}
