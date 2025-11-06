<?php

namespace App\Http\Controllers\Api\V1\OperatingUnit;

use App\Http\Controllers\Controller;
use App\Models\OperatingUnit;

/**
 * @OA\Delete(
 *   path="/api/v1/operating-units/{id}",
 *   summary="Delete an operating unit (soft delete)",
 *   tags={"Operating Units"},
 *   security={{"bearerAuth":{}}},
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
 *   @OA\Response(response=200, description="Operating unit deleted successfully"),
 *   @OA\Response(response=404, description="Operating unit not found")
 * )
 */
class DeleteOperatingUnitController extends Controller
{
    public function __invoke(int $id)
    {
        $operatingUnit = OperatingUnit::findOrFail($id);
        $operatingUnit->delete();

        return response()->json([
            'message' => 'Operating unit deleted successfully',
        ]);
    }
}
