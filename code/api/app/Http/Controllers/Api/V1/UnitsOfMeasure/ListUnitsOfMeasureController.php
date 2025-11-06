<?php

namespace App\Http\Controllers\Api\V1\UnitsOfMeasure;

use App\Http\Controllers\Controller;
use App\Http\Requests\UnitsOfMeasure\ListUnitsOfMeasureRequest;
use App\Http\Responses\Common\ResponsePaginated;
use App\Models\UnitOfMeasure;

/**
 * @OA\Get(
 *   path="/api/v1/units-of-measure",
 *   summary="List Units of Measure",
 *   tags={"Units of Measure"},
 *   @OA\Parameter(
 *       name="is_active",
 *       in="query",
 *       description="Filter by active status",
 *       required=false,
 *       @OA\Schema(type="boolean")
 *   ),
 *   @OA\Parameter(
 *       name="is_decimal",
 *       in="query",
 *       description="Filter by decimal support",
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
 *       description="Units of measure retrieved successfully",
 *       @OA\JsonContent(
 *           allOf={
 *              @OA\Schema(ref="#/components/schemas/ResponsePaginated"),
 *              @OA\Schema(
 *                  @OA\Property(
 *                      property="data",
 *                      type="array",
 *                      @OA\Items(ref="#/components/schemas/UnitOfMeasureResponse")
 *                  )
 *              )
 *           }
 *       )
 *   )
 * )
 */
class ListUnitsOfMeasureController extends Controller
{
    public function __invoke(ListUnitsOfMeasureRequest $request)
    {
        $query = UnitOfMeasure::query();

        if ($request->filled('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->filled('is_decimal')) {
            $query->where('is_decimal', $request->boolean('is_decimal'));
        }

        $perPage = $request->input('per_page', 15);
        $units = $query->orderBy('code')->paginate($perPage);

        return new ResponsePaginated(
            paginator: $units
        );
    }
}
