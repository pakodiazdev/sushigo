<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\ReplenishmentPolicy;

use App\Http\Controllers\Controller;
use App\Http\Resources\Inventory\ReplenishmentPolicy\ReplenishmentPolicyResource;
use App\Models\InventoryLocation;
use App\Support\Access\OperatingUnitScope;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * @OA\Get(
 *   path="/api/v1/inventory-locations/{id}/replenishment-policies",
 *   summary="List the replenishment policies configured at an Inventory Location",
 *   tags={"Replenishment Policies"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="string"), description="Inventory Location public_id (ULID)"),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Policies retrieved successfully",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *              @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *              @OA\Schema(@OA\Property(property="data", type="array", @OA\Items(ref="#/components/schemas/ReplenishmentPolicyResponse")))
 *           }
 *       )
 *   ),
 *
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires stock.view permission"),
 *   @OA\Response(response=404, description="Inventory Location not found", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class ListLocationReplenishmentPoliciesController extends Controller
{
    public function __invoke(string $id, OperatingUnitScope $scope): AnonymousResourceCollection
    {
        $location = InventoryLocation::findByPublicIdOrFail($id);

        // Horizontal authorization (#440): replenishment policies are scoped to
        // their location's Operating Unit, same as the location itself.
        $scope->assertCanAccessLocation(request()->user(), $location);

        $policies = $location->replenishmentPolicies()
            ->with(['inventoryLocation', 'itemVariant'])
            ->join('item_variants', 'item_variants.id', '=', 'variant_location_replenishment_policies.item_variant_id')
            ->orderBy('item_variants.code')
            ->select('variant_location_replenishment_policies.*')
            ->get();

        return ReplenishmentPolicyResource::collection($policies);
    }
}
