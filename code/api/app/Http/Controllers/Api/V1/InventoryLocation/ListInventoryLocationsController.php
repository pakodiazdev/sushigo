<?php

namespace App\Http\Controllers\Api\V1\InventoryLocation;

use App\Http\Controllers\Controller;
use App\Http\Requests\InventoryLocation\ListInventoryLocationsRequest;
use App\Http\Responses\Common\ResponsePaginated;
use App\Models\InventoryLocation;
use App\Models\OperatingUnit;
use App\Support\Access\OperatingUnitScope;

/**
 * @OA\Get(
 *   path="/api/v1/inventory-locations",
 *   summary="List Inventory Locations",
 *   tags={"Inventory Locations"},
 *
 *   @OA\Parameter(name="operating_unit_id", in="query", required=false, @OA\Schema(type="integer")),
 *   @OA\Parameter(name="type", in="query", required=false, @OA\Schema(type="string", enum={"MAIN", "TEMP", "KITCHEN", "BAR", "RETURN"})),
 *   @OA\Parameter(name="is_active", in="query", required=false, @OA\Schema(type="boolean")),
 *   @OA\Parameter(name="can_receive_purchases", in="query", required=false, @OA\Schema(type="boolean")),
 *   @OA\Parameter(name="per_page", in="query", required=false, @OA\Schema(type="integer")),
 *
 *   @OA\Response(response=200, description="Success", @OA\JsonContent(ref="#/components/schemas/ResponsePaginated")),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires inventory_locations.view or receipts.manage permission")
 * )
 */
class ListInventoryLocationsController extends Controller
{
    public function __invoke(ListInventoryLocationsRequest $request, OperatingUnitScope $scope)
    {
        $query = InventoryLocation::query()
            ->with(['operatingUnit.branch']);

        // Horizontal authorization (#440): restrict the result set to the
        // caller's accessible Operating Units before any request filter is
        // applied, so an `operating_unit_id` filter can never widen the scope.
        $scope->constrainLocations($query, $request->user());

        // Filter by operating unit
        if ($request->filled('operating_unit_id')) {
            $query->where('operating_unit_id', $request->operating_unit_id);
        }

        // Filter by type
        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        // Filter by active status
        if ($request->filled('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        // Filter by purchase-receiving capability (#568). Uses has() + a null
        // check rather than filled() so an explicit `?can_receive_purchases=0`
        // (false) still narrows the result set; an unparseable value is
        // coerced to null upstream and treated as "no filter".
        if ($request->has('can_receive_purchases') && $request->input('can_receive_purchases') !== null) {
            $query->where('can_receive_purchases', $request->boolean('can_receive_purchases'));
        }

        // Order by priority desc, then name
        $query->orderBy('priority', 'desc')
            ->orderBy('name');

        $perPage = $request->input('per_page', 15);
        $locations = $query->paginate($perPage);

        // Transform the data to include all required fields. `operating_unit` is
        // serialized as a nested object (not just the FK id) so scoped consumers
        // — e.g. the Purchase Receipt destination picker grouping by unit (#572) —
        // don't need a second lookup; the relation is already eager-loaded above.
        $locations->getCollection()->transform(fn ($location) => [
            'id' => $location->public_id,
            'operating_unit_id' => $location->operating_unit_id,
            'name' => $location->name,
            'type' => $location->type,
            'priority' => $location->priority,
            'is_primary' => $location->is_primary,
            'is_active' => $location->is_active,
            'can_receive_purchases' => $location->can_receive_purchases,
            'operating_unit' => $this->formatOperatingUnit($location->operatingUnit),
        ]);

        return new ResponsePaginated($locations);
    }

    /**
     * @return array<string, mixed>|null
     */
    private function formatOperatingUnit(?OperatingUnit $unit): ?array
    {
        if ($unit === null) {
            return null;
        }

        $branch = $unit->branch;

        return [
            'id' => $unit->id,
            'name' => $unit->name,
            'type' => $unit->type,
            'branch' => $branch === null ? null : [
                'id' => $branch->id,
                'code' => $branch->code,
                'name' => $branch->name,
            ],
        ];
    }
}
