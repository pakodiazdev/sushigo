<?php

namespace App\Http\Controllers\Api\V1\UnitsOfMeasure;

use App\Http\Controllers\Controller;
use App\Http\Responses\Common\ResponsePaginated;
use App\Models\UomConversion;
use Illuminate\Http\Request;

/**
 * @OA\Get(
 *   path="/api/v1/uom-conversions",
 *   summary="List UOM Conversions",
 *   tags={"Units of Measure"},
 *   @OA\Parameter(
 *       name="from_uom_id",
 *       in="query",
 *       description="Filter by source UOM ID",
 *       required=false,
 *       @OA\Schema(type="integer")
 *   ),
 *   @OA\Parameter(
 *       name="to_uom_id",
 *       in="query",
 *       description="Filter by target UOM ID",
 *       required=false,
 *       @OA\Schema(type="integer")
 *   ),
 *   @OA\Parameter(
 *       name="is_active",
 *       in="query",
 *       description="Filter by active status",
 *       required=false,
 *       @OA\Schema(type="boolean")
 *   ),
 *   @OA\Parameter(
 *       name="per_page",
 *       in="query",
 *       description="Items per page",
 *       required=false,
 *       @OA\Schema(type="integer", default=15)
 *   ),
 *   @OA\Response(
 *       response=200,
 *       description="UOM conversions retrieved successfully",
 *       @OA\JsonContent(
 *           allOf={
 *              @OA\Schema(ref="#/components/schemas/ResponsePaginated"),
 *              @OA\Schema(
 *                  @OA\Property(
 *                      property="data",
 *                      type="array",
 *                      @OA\Items(ref="#/components/schemas/UomConversionResponse")
 *                  )
 *              )
 *           }
 *       )
 *   )
 * )
 */
class ListUomConversionsController extends Controller
{
    public function __invoke(Request $request)
    {
        $query = UomConversion::with(['fromUom', 'toUom']);

        if ($request->filled('from_uom_id')) {
            $query->where('from_uom_id', $request->from_uom_id);
        }

        if ($request->filled('to_uom_id')) {
            $query->where('to_uom_id', $request->to_uom_id);
        }

        if ($request->filled('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $perPage = $request->input('per_page', 15);
        $conversions = $query->paginate($perPage);

        return new ResponsePaginated(
            paginator: $conversions
        );
    }
}
