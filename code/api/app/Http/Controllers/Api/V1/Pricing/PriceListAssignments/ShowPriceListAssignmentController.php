<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Pricing\PriceListAssignments;

use App\Http\Controllers\Controller;
use App\Http\Resources\Pricing\PriceListAssignmentResource;
use App\Models\PriceListAssignment;
use Illuminate\Support\Facades\Gate;

/**
 * @OA\Get(
 *   path="/api/v1/pricing/price-list-assignments/{priceListAssignment}",
 *   summary="Show Price List Assignment",
 *   tags={"Price List Assignments"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="priceListAssignment", in="path", required=true, @OA\Schema(type="string")),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Price List Assignment retrieved successfully",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *              @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *              @OA\Schema(@OA\Property(property="data", ref="#/components/schemas/PriceListAssignmentResponse"))
 *           }
 *       )
 *   ),
 *
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires branch access"),
 *   @OA\Response(response=404, description="Price List Assignment not found", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class ShowPriceListAssignmentController extends Controller
{
    public function __invoke(PriceListAssignment $priceListAssignment): PriceListAssignmentResource
    {
        Gate::authorize('view', $priceListAssignment);

        return new PriceListAssignmentResource($priceListAssignment->load('priceList'));
    }
}
