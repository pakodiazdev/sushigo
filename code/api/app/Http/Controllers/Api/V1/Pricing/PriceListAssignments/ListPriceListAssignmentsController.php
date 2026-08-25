<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Pricing\PriceListAssignments;

use App\Http\Controllers\Concerns\ScopesToUserBranches;
use App\Http\Controllers\Controller;
use App\Http\Resources\Pricing\PriceListAssignmentResource;
use App\Http\Responses\Common\ResponsePaginated;
use App\Models\PriceListAssignment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

/**
 * @OA\Get(
 *   path="/api/v1/pricing/price-list-assignments",
 *   summary="List Price List Assignments",
 *   description="Scoped to the requesting user's active branch assignments.",
 *   tags={"Price List Assignments"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="branch_id", in="query", @OA\Schema(type="integer")),
 *   @OA\Parameter(name="is_active", in="query", @OA\Schema(type="boolean")),
 *   @OA\Parameter(name="per_page", in="query", @OA\Schema(type="integer", default=15, minimum=1, maximum=100)),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Price List Assignments retrieved successfully",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *              @OA\Schema(ref="#/components/schemas/ResponsePaginated"),
 *              @OA\Schema(@OA\Property(property="data", type="array", @OA\Items(ref="#/components/schemas/PriceListAssignmentResponse")))
 *           }
 *       )
 *   ),
 *
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires price_list_assignments.view permission")
 * )
 */
class ListPriceListAssignmentsController extends Controller
{
    use ScopesToUserBranches;

    public function __invoke(Request $request): ResponsePaginated
    {
        Gate::authorize('viewAny', PriceListAssignment::class);

        $perPage = $request->validate([
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ])['per_page'] ?? 15;

        $query = PriceListAssignment::with('priceList')
            ->whereIn('branch_id', $this->userBranchIds($request))
            ->orderByDesc('id');

        if ($request->has('branch_id')) {
            $query->where('branch_id', $request->input('branch_id'));
        }

        if ($request->has('is_active')) {
            $query->where('is_active', filter_var($request->input('is_active'), FILTER_VALIDATE_BOOLEAN));
        }

        $assignments = $query->paginate($perPage);
        $assignments->getCollection()->transform(fn ($assignment) => (new PriceListAssignmentResource($assignment))->resolve());

        return new ResponsePaginated(paginator: $assignments);
    }
}
