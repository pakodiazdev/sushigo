<?php

namespace App\Http\Controllers\Api\V1\UnitsOfMeasure;

use App\Http\Controllers\Controller;
use App\Http\Requests\UnitsOfMeasure\CreateUomConversionRequest;
use App\Http\Responses\Common\ResponseEntity;
use App\Models\UomConversion;

/**
 * @OA\Post(
 *   path="/api/v1/uom-conversions",
 *   summary="Create UOM Conversion",
 *   tags={"Units of Measure"},
 *   security={{"passport": {}}},
 *   @OA\RequestBody(
 *       required=true,
 *       @OA\JsonContent(ref="#/components/schemas/CreateUomConversionRequest")
 *   ),
 *   @OA\Response(
 *       response=201,
 *       description="UOM conversion created successfully",
 *       @OA\JsonContent(
 *           allOf={
 *              @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *              @OA\Schema(
 *                  @OA\Property(property="data", ref="#/components/schemas/UomConversionResponse")
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
class CreateUomConversionController extends Controller
{
    public function __invoke(CreateUomConversionRequest $request)
    {
        $conversion = UomConversion::create([
            'from_uom_id' => $request->from_uom_id,
            'to_uom_id' => $request->to_uom_id,
            'factor' => $request->factor,
            'tolerance' => $request->input('tolerance', 0),
            'is_active' => $request->input('is_active', true),
            'meta' => [],
        ]);

        $conversion->load(['fromUom', 'toUom']);

        return new ResponseEntity(
            data: [
                'id' => $conversion->id,
                'from_uom_id' => $conversion->from_uom_id,
                'to_uom_id' => $conversion->to_uom_id,
                'factor' => (float) $conversion->factor,
                'tolerance' => (float) $conversion->tolerance,
                'is_active' => $conversion->is_active,
                'from_uom' => [
                    'id' => $conversion->fromUom->id,
                    'code' => $conversion->fromUom->code,
                    'name' => $conversion->fromUom->name,
                    'symbol' => $conversion->fromUom->symbol,
                ],
                'to_uom' => [
                    'id' => $conversion->toUom->id,
                    'code' => $conversion->toUom->code,
                    'name' => $conversion->toUom->name,
                    'symbol' => $conversion->toUom->symbol,
                ],
                'created_at' => $conversion->created_at,
                'updated_at' => $conversion->updated_at,
            ],
            status: 201
        );
    }
}
