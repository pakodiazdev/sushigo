<?php

namespace App\Http\Controllers\Api\V1\UnitsOfMeasure;

use App\Http\Controllers\Controller;
use App\Http\Requests\UnitsOfMeasure\CreateUnitOfMeasureRequest;
use App\Http\Responses\Common\ResponseEntity;
use App\Models\UnitOfMeasure;

/**
 * @OA\Post(
 *   path="/api/v1/units-of-measure",
 *   summary="Create Unit of Measure",
 *   tags={"Units of Measure"},
 *   security={{"passport": {}}},
 *   @OA\RequestBody(
 *       required=true,
 *       @OA\JsonContent(ref="#/components/schemas/CreateUnitOfMeasureRequest")
 *   ),
 *   @OA\Response(
 *       response=201,
 *       description="Unit of measure created successfully",
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
 *       response=422,
 *       description="Validation Error",
 *       @OA\JsonContent(ref="#/components/schemas/ResponseError")
 *   )
 * )
 */
class CreateUnitOfMeasureController extends Controller
{
    public function __invoke(CreateUnitOfMeasureRequest $request)
    {
        $uom = UnitOfMeasure::create([
            'code' => $request->code,
            'name' => $request->name,
            'symbol' => $request->symbol,
            'precision' => $request->input('precision', 2),
            'is_decimal' => $request->input('is_decimal', true),
            'is_active' => $request->input('is_active', true),
            'meta' => [],
        ]);

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
            ],
            status: 201
        );
    }
}
