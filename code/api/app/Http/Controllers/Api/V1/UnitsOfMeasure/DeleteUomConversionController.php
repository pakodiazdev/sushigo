<?php

namespace App\Http\Controllers\Api\V1\UnitsOfMeasure;

use App\Http\Controllers\Controller;
use App\Http\Responses\Common\ResponseMessage;
use App\Models\UomConversion;

/**
 * @OA\Delete(
 *   path="/api/v1/uom-conversions/{id}",
 *   summary="Delete UOM Conversion",
 *   tags={"Units of Measure"},
 *   security={{"passport": {}}},
 *   @OA\Parameter(
 *       name="id",
 *       in="path",
 *       description="UOM Conversion ID",
 *       required=true,
 *       @OA\Schema(type="integer")
 *   ),
 *   @OA\Response(
 *       response=200,
 *       description="UOM conversion deleted successfully",
 *       @OA\JsonContent(ref="#/components/schemas/ResponseMessage")
 *   ),
 *   @OA\Response(
 *       response=404,
 *       description="UOM conversion not found",
 *       @OA\JsonContent(ref="#/components/schemas/ResponseError")
 *   )
 * )
 */
class DeleteUomConversionController extends Controller
{
    public function __invoke(int $id)
    {
        $conversion = UomConversion::findOrFail($id);
        $conversion->delete();

        return new ResponseMessage(
            message: 'UOM conversion deleted successfully'
        );
    }
}
