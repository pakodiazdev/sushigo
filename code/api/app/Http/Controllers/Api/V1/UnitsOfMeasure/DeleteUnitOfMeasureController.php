<?php

namespace App\Http\Controllers\Api\V1\UnitsOfMeasure;

use App\Http\Controllers\Controller;
use App\Http\Responses\Common\ResponseMessage;
use App\Models\StockMovementLine;
use App\Models\StockTransferLine;
use App\Models\UnitOfMeasure;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

/**
 * @OA\Delete(
 *   path="/api/v1/units-of-measure/{id}",
 *   summary="Delete Unit of Measure",
 *   tags={"Units of Measure"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(
 *       name="id",
 *       in="path",
 *       description="Unit of Measure ID",
 *       required=true,
 *
 *       @OA\Schema(type="integer")
 *   ),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Unit of measure deleted successfully",
 *
 *       @OA\JsonContent(ref="#/components/schemas/ResponseMessage")
 *   ),
 *
 *   @OA\Response(
 *       response=404,
 *       description="Unit of measure not found",
 *
 *       @OA\JsonContent(ref="#/components/schemas/ResponseError")
 *   ),
 *
 *   @OA\Response(
 *       response=409,
 *       description="Cannot delete - UOM is in use",
 *
 *       @OA\JsonContent(ref="#/components/schemas/ResponseError")
 *   )
 * )
 */
class DeleteUnitOfMeasureController extends Controller
{
    public function __invoke(string $id)
    {
        $uom = UnitOfMeasure::findByPublicIdOrFail($id);

        // Reject if the UOM is still referenced. `item_variants` was the only
        // check; movement lines and stock-transfer lines also carry a RESTRICT
        // FK to it, so without these checks the hard delete below throws a
        // database integrity error (500) *after* already removing this UOM's
        // conversions — a partial, non-atomic failure.
        $blockedBy = match (true) {
            $uom->itemVariants()->exists() => 'item variants',
            StockMovementLine::where('uom_id', $uom->id)->exists() => 'stock movement history',
            StockTransferLine::where('entry_uom_id', $uom->id)->exists() => 'stock transfer history',
            default => null,
        };

        if ($blockedBy !== null) {
            return response()->json([
                'status' => 409,
                'message' => "Cannot delete a unit of measure that is in use by {$blockedBy}",
                'errors' => [],
            ], 409);
        }

        // Remove the UOM and its conversions atomically. The checks above race a
        // concurrent insert of a new reference, so also translate the RESTRICT
        // FK violation itself into the same 409 rather than a 500.
        try {
            DB::transaction(function () use ($uom): void {
                $uom->conversionsFrom()->delete();
                $uom->conversionsTo()->delete();
                $uom->delete();
            });
        } catch (QueryException $e) {
            if (in_array($e->getCode(), ['23503', '23000'], true)) {
                return response()->json([
                    'status' => 409,
                    'message' => 'Cannot delete a unit of measure that is now referenced by other records',
                    'errors' => [],
                ], 409);
            }

            throw $e;
        }

        return new ResponseMessage(
            message: 'Unit of measure deleted successfully'
        );
    }
}
