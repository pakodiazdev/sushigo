<?php

namespace App\Http\Controllers\Api\V1\OperatingUnit;

use App\Http\Controllers\Controller;
use App\Models\OperatingUnit;

/**
 * @OA\Get(
 *   path="/api/v1/operating-units/{id}",
 *   summary="Get a single operating unit by ID",
 *   tags={"Operating Units"},
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
 *   @OA\Response(response=200, description="Operating unit retrieved successfully"),
 *   @OA\Response(response=404, description="Operating unit not found")
 * )
 */
class ShowOperatingUnitController extends Controller
{
    public function __invoke(int $id)
    {
        $operatingUnit = OperatingUnit::with(['branch', 'inventoryLocations'])->findOrFail($id);

        return response()->json([
            'data' => $operatingUnit,
        ]);
    }
}
