<?php

namespace App\Http\Controllers\Api\V1\UnitsOfMeasure;

use App\Http\Controllers\Controller;
use App\Http\Responses\Common\ResponseMessage;
use App\Models\UnitOfMeasure;

/**
 * @OA\Delete(
 *   path="/api/v1/units-of-measure/{id}",
 *   summary="Delete Unit of Measure",
 *   tags={"Units of Measure"},
 *   security={{"passport": {}}},
 *   @OA\Parameter(
 *       name="id",
 *       in="path",
 *       description="Unit of Measure ID",
 *       required=true,
 *       @OA\Schema(type="integer")
 *   ),
 *   @OA\Response(
 *       response=200,
 *       description="Unit of measure deleted successfully",
 *       @OA\JsonContent(ref="#/components/schemas/ResponseMessage")
 *   ),
 *   @OA\Response(
 *       response=404,
 *       description="Unit of measure not found",
 *       @OA\JsonContent(ref="#/components/schemas/ResponseError")
 *   ),
 *   @OA\Response(
 *       response=409,
 *       description="Cannot delete - UOM is in use",
 *       @OA\JsonContent(ref="#/components/schemas/ResponseError")
 *   )
 * )
 */
class DeleteUnitOfMeasureController extends Controller
{
    public function __invoke(int $id)
    {
        $uom = UnitOfMeasure::findOrFail($id);

        // Check if UOM is in use
        if ($uom->itemVariants()->exists()) {
            return response()->json([
                'status' => 409,
                'message' => 'Cannot delete unit of measure that is in use by item variants',
                'errors' => [],
            ], 409);
        }

        // Soft delete conversions
        $uom->conversionsFrom()->delete();
        $uom->conversionsTo()->delete();

        // Soft delete the UOM
        $uom->delete();

        return new ResponseMessage(
            message: 'Unit of measure deleted successfully'
        );
    }
}
