<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Pricing\PriceListAssignments;

use App\Http\Controllers\Controller;
use App\Http\Requests\Pricing\PriceListAssignments\StorePriceListAssignmentRequest;
use App\Http\Resources\Pricing\PriceListAssignmentResource;
use App\Services\Pricing\PriceListAssignmentService;

/**
 * @OA\Post(
 *   path="/api/v1/pricing/price-list-assignments",
 *   summary="Create Price List Assignment",
 *   description="Assigns a Price List to a Branch or, more specifically, an Operating Unit within it. Requires an active OperatingUnit assignment in the target Branch.",
 *   tags={"Price List Assignments"},
 *   security={{"passport": {}}},
 *
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/StorePriceListAssignmentRequest")),
 *
 *   @OA\Response(
 *       response=201,
 *       description="Price List Assignment created successfully",
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
 *   @OA\Response(response=403, description="Forbidden — requires price_list_assignments.create permission and branch access"),
 *   @OA\Response(response=422, description="Validation Error — including overlap/priority-tie conflicts", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class CreatePriceListAssignmentController extends Controller
{
    public function __invoke(StorePriceListAssignmentRequest $request, PriceListAssignmentService $service): PriceListAssignmentResource
    {
        $assignment = $service->create($request->assignmentData());

        return (new PriceListAssignmentResource($assignment->load('priceList')))->setStatusCode(201);
    }
}
