<?php

namespace App\Http\Controllers\Api\V1\InventoryLocation;

use App\Http\Controllers\Controller;
use App\Http\Requests\InventoryLocation\ListInventoryLocationsRequest;
use App\Http\Responses\Common\ResponsePaginated;
use App\Models\InventoryLocation;
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

        // Order by priority desc, then name
        $query->orderBy('priority', 'desc')
            ->orderBy('name');

        $perPage = $request->input('per_page', 15);
        $locations = $query->paginate($perPage);

        // Transform the data to include all required fields
        $locations->getCollection()->transform(function ($location) {
            return [
                'id' => $location->public_id,
                'operating_unit_id' => $location->operating_unit_id,
                'name' => $location->name,
                'type' => $location->type,
                'priority' => $location->priority,
                'is_primary' => $location->is_primary,
                'is_active' => $location->is_active,
            ];
        });

        return new ResponsePaginated($locations);
    }
}
