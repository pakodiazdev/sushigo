<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\VariantAssignment;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\VariantAssignment\ListLocationVariantAssignmentsRequest;
use App\Http\Resources\Inventory\VariantAssignment\VariantLocationAssignmentResource;
use App\Http\Responses\Common\ResponsePaginated;
use App\Models\InventoryLocation;
use App\Models\ItemVariant;
use App\Support\Access\OperatingUnitScope;
use Illuminate\Database\Query\JoinClause;
use Illuminate\Support\Carbon;

/**
 * @OA\Get(
 *   path="/api/v1/inventory-locations/{id}/variant-assignments",
 *   summary="List the managed-assortment state of Variants at an Inventory Location",
 *   description="Variant-centric listing for a Variant picker. `state=assigned` (default) returns the managed assortment, `state=unassigned` the assignable remainder, `state=all` every active Variant annotated with its assignment state. Searchable and paginated.",
 *   tags={"Variant Location Assignments"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="string"), description="Inventory Location public_id (ULID)"),
 *   @OA\Parameter(name="state", in="query", required=false, @OA\Schema(type="string", enum={"assigned", "unassigned", "all"}, default="assigned")),
 *   @OA\Parameter(name="search", in="query", required=false, @OA\Schema(type="string"), description="Case-insensitive match on Variant code, name or barcode"),
 *   @OA\Parameter(name="per_page", in="query", required=false, @OA\Schema(type="integer", default=25)),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Managed-assortment state retrieved successfully",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *              @OA\Schema(ref="#/components/schemas/ResponsePaginated"),
 *              @OA\Schema(@OA\Property(property="data", type="array", @OA\Items(ref="#/components/schemas/VariantLocationAssignmentResponse")))
 *           }
 *       )
 *   ),
 *
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires stock.view permission and access to the location's Operating Unit"),
 *   @OA\Response(response=404, description="Inventory Location not found", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class ListLocationVariantAssignmentsController extends Controller
{
    public function __invoke(
        ListLocationVariantAssignmentsRequest $request,
        string $id,
        OperatingUnitScope $scope
    ): ResponsePaginated {
        $location = InventoryLocation::findByPublicIdOrFail($id);

        // Horizontal authorization (#440): assignments are scoped to their
        // location's Operating Unit, same as the location itself.
        $scope->assertCanAccessLocation($request->user(), $location);

        $state = $request->state();

        $query = ItemVariant::query()
            ->leftJoin('variant_location_assignments as vla', function (JoinClause $join) use ($location) {
                $join->on('vla.item_variant_id', '=', 'item_variants.id')
                    ->where('vla.inventory_location_id', '=', $location->id)
                    ->whereNull('vla.deleted_at');
            })
            ->select([
                'item_variants.*',
                'vla.public_id as assignment_public_id',
                'vla.created_at as assignment_created_at',
            ]);

        // "Relevant catalog rules" apply to *candidates*, not to what is
        // already assigned: an inactive/soft-deleted Variant is never offered
        // as something new to assign, but a Variant deactivated after being
        // assigned must stay visible here (in `assigned` and `all`) so an
        // operator can discover and unassign it — the write path already
        // rejects assigning an inactive Variant (422), so a stale active
        // assignment can only get here by the Variant being deactivated
        // afterward, and hiding it would make that state undiscoverable.
        $query->where(function ($q) {
            $q->where('item_variants.is_active', true)->orWhereNotNull('vla.id');
        });

        if ($state === 'assigned') {
            $query->whereNotNull('vla.id');
        } elseif ($state === 'unassigned') {
            $query->whereNull('vla.id');
        }

        if ($term = $request->searchTerm()) {
            $like = '%'.str_replace(['%', '_'], ['\%', '\_'], $term).'%';
            $query->where(function ($q) use ($like) {
                $q->where('item_variants.code', 'ilike', $like)
                    ->orWhere('item_variants.name', 'ilike', $like)
                    ->orWhere('item_variants.barcode', 'ilike', $like);
            });
        }

        $variants = $query->orderBy('item_variants.code')->paginate($request->perPage());

        $variants->getCollection()->transform(function (ItemVariant $variant) use ($location) {
            $assignedAt = $variant->assignment_created_at;
            $variant->setAttribute('assigned_at', $assignedAt
                ? Carbon::parse($assignedAt)->toIso8601String()
                : null);
            $variant->setAttribute('location_public_id', $location->public_id);

            return (new VariantLocationAssignmentResource($variant))->resolve();
        });

        return new ResponsePaginated($variants);
    }
}
