<?php

namespace App\Http\Controllers\CashAdjustments\CashTerminals;

use App\Http\Controllers\Controller;
use App\Models\CashTerminal;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @OA\Get(
 *   path="/api/v1/cash-terminals",
 *   summary="List Cash Terminals",
 *   tags={"Cash Terminals"},
 *   security={{"bearerAuth":{}}},
 *   @OA\Parameter(name="branch_id", in="query", @OA\Schema(type="integer"), description="Filter by branch ID"),
 *   @OA\Parameter(name="provider", in="query", @OA\Schema(type="string"), description="Filter by provider"),
 *   @OA\Parameter(name="is_active", in="query", @OA\Schema(type="boolean"), description="Filter by active status"),
 *   @OA\Parameter(name="per_page", in="query", @OA\Schema(type="integer", default=15), description="Items per page"),
 *   @OA\Response(response=200, description="Cash terminals retrieved successfully"),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden")
 * )
 */
class ListCashTerminalsController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $query = CashTerminal::with('branch');

        if ($request->has('branch_id')) {
            $query->byBranch($request->input('branch_id'));
        }

        if ($request->has('provider')) {
            $query->byProvider($request->input('provider'));
        }

        if ($request->has('is_active')) {
            $isActive = filter_var($request->input('is_active'), FILTER_VALIDATE_BOOLEAN);
            if ($isActive) {
                $query->active();
            } else {
                $query->where('is_active', false);
            }
        }

        $sortBy = $request->input('sort_by', 'name');
        $sortOrder = $request->input('sort_order', 'asc');
        $query->orderBy($sortBy, $sortOrder);

        $perPage = $request->input('per_page', 15);
        $terminals = $query->paginate($perPage);

        return response()->json($terminals);
    }
}
