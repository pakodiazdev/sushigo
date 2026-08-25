<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Pricing\PriceListAssignments;

use App\Http\Controllers\Controller;
use App\Http\Requests\Pricing\PriceListAssignments\UpdatePriceListAssignmentRequest;
use App\Http\Resources\Pricing\PriceListAssignmentResource;
use App\Models\PriceListAssignment;
use App\Services\Pricing\PriceListAssignmentService;

/**
 * @OA\Put(
 *   path="/api/v1/pricing/price-list-assignments/{priceListAssignment}",
 *   summary="Update Price List Assignment",
 *   tags={"Price List Assignments"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="priceListAssignment", in="path", required=true, @OA\Schema(type="string")),
 *
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/UpdatePriceListAssignmentRequest")),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Price List Assignment updated successfully",
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
 *   @OA\Response(response=403, description="Forbidden — requires price_list_assignments.update permission and branch access"),
 *   @OA\Response(response=404, description="Price List Assignment not found", @OA\JsonContent(ref="#/components/schemas/ResponseError")),
 *   @OA\Response(response=422, description="Validation Error — including overlap/priority-tie conflicts", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class UpdatePriceListAssignmentController extends Controller
{
    public function __invoke(UpdatePriceListAssignmentRequest $request, PriceListAssignment $priceListAssignment, PriceListAssignmentService $service): PriceListAssignmentResource
    {
        $assignment = $service->update($priceListAssignment, $request->assignmentData());

        return new PriceListAssignmentResource($assignment->load('priceList'));
    }
}
