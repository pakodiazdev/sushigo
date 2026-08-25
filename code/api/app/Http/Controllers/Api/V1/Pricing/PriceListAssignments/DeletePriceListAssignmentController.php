<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Pricing\PriceListAssignments;

use App\Http\Controllers\Controller;
use App\Http\Responses\Common\ResponseMessage;
use App\Models\PriceListAssignment;
use Illuminate\Support\Facades\Gate;

/**
 * @OA\Delete(
 *   path="/api/v1/pricing/price-list-assignments/{priceListAssignment}",
 *   summary="Delete Price List Assignment",
 *   tags={"Price List Assignments"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="priceListAssignment", in="path", required=true, @OA\Schema(type="string")),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Price List Assignment deleted successfully",
 *
 *       @OA\JsonContent(ref="#/components/schemas/ResponseMessage")
 *   ),
 *
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires price_list_assignments.delete permission and branch access"),
 *   @OA\Response(response=404, description="Price List Assignment not found", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class DeletePriceListAssignmentController extends Controller
{
    public function __invoke(PriceListAssignment $priceListAssignment): ResponseMessage
    {
        Gate::authorize('delete', $priceListAssignment);

        $priceListAssignment->delete();

        return new ResponseMessage(message: 'Price list assignment deleted successfully');
    }
}
