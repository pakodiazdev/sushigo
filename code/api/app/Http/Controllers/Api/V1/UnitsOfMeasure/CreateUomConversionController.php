<?php

namespace App\Http\Controllers\Api\V1\UnitsOfMeasure;

use App\Http\Controllers\Controller;
use App\Http\Requests\UnitsOfMeasure\CreateUomConversionRequest;
use App\Http\Resources\UnitsOfMeasure\UomConversionResource;
use App\Models\UomConversion;

/**
 * @OA\Post(
 *   path="/api/v1/uom-conversions",
 *   summary="Create UOM Conversion",
 *   tags={"Units of Measure"},
 *   security={{"passport": {}}},
 *
 *   @OA\RequestBody(
 *       required=true,
 *
 *       @OA\JsonContent(ref="#/components/schemas/CreateUomConversionRequest")
 *   ),
 *
 *   @OA\Response(
 *       response=201,
 *       description="UOM conversion created successfully",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *              @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *              @OA\Schema(
 *
 *                  @OA\Property(property="data", ref="#/components/schemas/UomConversionResponse")
 *              )
 *           }
 *       )
 *   ),
 *
 *   @OA\Response(
 *       response=422,
 *       description="Validation Error",
 *
 *       @OA\JsonContent(ref="#/components/schemas/ResponseError")
 *   )
 * )
 */
class CreateUomConversionController extends Controller
{
    public function __invoke(CreateUomConversionRequest $request)
    {
        $conversion = UomConversion::create($request->conversionData());

        $conversion->load(['fromUom', 'toUom']);

        return (new UomConversionResource($conversion))->setStatusCode(201);
    }
}
