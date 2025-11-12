<?php

namespace App\Http\Controllers\Api\V1\OperatingUnit;

use App\Http\Controllers\Controller;
use App\Models\OperatingUnit;
use Illuminate\Http\Request;

/**
 * @OA\Get(
 *   path="/api/v1/operating-units",
 *   summary="List all operating units",
 *   tags={"Operating Units"},
 *   @OA\Parameter(name="per_page", in="query", required=false, @OA\Schema(type="integer")),
 *   @OA\Parameter(name="search", in="query", required=false, @OA\Schema(type="string")),
 *   @OA\Parameter(name="type", in="query", required=false, @OA\Schema(type="string")),
 *   @OA\Parameter(name="is_active", in="query", required=false, @OA\Schema(type="boolean")),
 *   @OA\Parameter(name="branch_id", in="query", required=false, @OA\Schema(type="integer")),
 *   @OA\Response(response=200, description="Operating units retrieved successfully"),
 * )
 */
class ListOperatingUnitsController extends Controller
{
    public function __invoke(Request $request)
    {
        $query = OperatingUnit::query()->with('branch');

        // Search filter
        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where('name', 'LIKE', "%{$search}%");
        }

        // Type filter
        if ($request->has('type')) {
            $query->where('type', $request->input('type'));
        }

        // Active status filter
        if ($request->has('is_active')) {
            $query->where('is_active', filter_var($request->input('is_active'), FILTER_VALIDATE_BOOLEAN));
        }

        // Branch filter
        if ($request->has('branch_id')) {
            $query->where('branch_id', $request->input('branch_id'));
        }

        // Order by name
        $query->orderBy('name', 'asc');

        // Pagination
        $perPage = $request->input('per_page', 15);
        $operatingUnits = $query->paginate($perPage);

        return response()->json($operatingUnits);
    }
}
