<?php

namespace App\Http\Controllers\CashAdjustments\CashRegisters;

use App\Http\Controllers\Controller;
use App\Models\CashRegister;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @OA\Get(
 *   path="/api/v1/cash-registers",
 *   summary="List Cash Registers",
 *   tags={"Cash Registers"},
 *   security={{"bearerAuth":{}}},
 *
 *   @OA\Parameter(name="branch_id", in="query", @OA\Schema(type="integer"), description="Filter by branch ID"),
 *   @OA\Parameter(name="type", in="query", @OA\Schema(type="string", enum={"ON_PREMISE", "DELIVERY", "EVENT"}), description="Filter by register type"),
 *   @OA\Parameter(name="is_active", in="query", @OA\Schema(type="boolean"), description="Filter by active status"),
 *   @OA\Parameter(name="sort_by", in="query", @OA\Schema(type="string", default="code"), description="Sort field"),
 *   @OA\Parameter(name="sort_order", in="query", @OA\Schema(type="string", enum={"asc", "desc"}, default="asc"), description="Sort order"),
 *   @OA\Parameter(name="per_page", in="query", @OA\Schema(type="integer", default=15), description="Items per page"),
 *
 *   @OA\Response(response=200, description="Cash registers retrieved successfully"),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden")
 * )
 */
class ListCashRegistersController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $query = CashRegister::with(['branch', 'operatingUnit']);

        // Filter by branch
        if ($request->has('branch_id')) {
            $query->byBranch($request->input('branch_id'));
        }

        // Filter by type
        if ($request->has('type')) {
            $query->byType($request->input('type'));
        }

        // Filter by active status
        if ($request->has('is_active')) {
            $isActive = filter_var($request->input('is_active'), FILTER_VALIDATE_BOOLEAN);
            if ($isActive) {
                $query->active();
            } else {
                $query->where('is_active', false);
            }
        }

        // Sorting
        $sortBy = $request->input('sort_by', 'code');
        $sortOrder = $request->input('sort_order', 'asc');
        $query->orderBy($sortBy, $sortOrder);

        // Pagination
        $perPage = $request->input('per_page', 15);
        $registers = $query->paginate($perPage);

        return response()->json($registers);
    }
}
