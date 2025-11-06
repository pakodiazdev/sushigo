<?php

namespace App\Http\Controllers\Api\V1\UnitsOfMeasure;

use App\Http\Controllers\Controller;
use App\Http\Requests\UnitsOfMeasure\UpdateUnitOfMeasureRequest;
use App\Http\Responses\Common\ResponseEntity;
use App\Models\UnitOfMeasure;

/**
 * @OA\Put(
 *   path="/api/v1/units-of-measure/{id}",
 *   summary="Update Unit of Measure",
 *   tags={"Units of Measure"},
 *   security={{"passport": {}}},
 *   @OA\Parameter(
 *       name="id",
 *       in="path",
 *       description="Unit of Measure ID",
 *       required=true,
 *       @OA\Schema(type="integer")
 *   ),
 *   @OA\RequestBody(
 *       required=true,
 *       @OA\JsonContent(ref="#/components/schemas/UpdateUnitOfMeasureRequest")
 *   ),
 *   @OA\Response(
 *       response=200,
 *       description="Unit of measure updated successfully",
 *       @OA\JsonContent(
 *           allOf={
 *              @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *              @OA\Schema(
 *                  @OA\Property(property="data", ref="#/components/schemas/UnitOfMeasureResponse")
 *              )
 *           }
 *       )
 *   ),
 *   @OA\Response(
 *       response=404,
 *       description="Unit of measure not found",
 *       @OA\JsonContent(ref="#/components/schemas/ResponseError")
 *   ),
 *   @OA\Response(
 *       response=422,
 *       description="Validation Error",
 *       @OA\JsonContent(ref="#/components/schemas/ResponseError")
 *   )
 * )
 */
class UpdateUnitOfMeasureController extends Controller
{
    public function __invoke(UpdateUnitOfMeasureRequest $request, int $id)
    {
        $uom = UnitOfMeasure::findOrFail($id);
        $uom->update($request->validated());

        return new ResponseEntity(
            data: [
                'id' => $uom->id,
                'code' => $uom->code,
                'name' => $uom->name,
                'symbol' => $uom->symbol,
                'precision' => $uom->precision,
                'is_decimal' => $uom->is_decimal,
                'is_active' => $uom->is_active,
                'created_at' => $uom->created_at,
                'updated_at' => $uom->updated_at,
            ]
        );
    }
}
