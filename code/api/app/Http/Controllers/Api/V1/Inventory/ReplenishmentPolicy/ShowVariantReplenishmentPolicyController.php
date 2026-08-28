<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\ReplenishmentPolicy;

use App\Http\Controllers\Controller;
use App\Http\Resources\Inventory\ReplenishmentPolicy\ReplenishmentPolicyResource;
use App\Models\InventoryLocation;
use App\Models\ItemVariant;
use App\Models\VariantLocationReplenishmentPolicy;
use App\Services\Inventory\ReplenishmentPolicyResolver;
use App\Support\Access\OperatingUnitScope;

/**
 * @OA\Get(
 *   path="/api/v1/inventory-locations/{id}/replenishment-policies/{variantId}",
 *   summary="Get the resolved replenishment policy for a Variant at an Inventory Location",
 *   description="Returns a synthetic response with is_configured=false and zeroed thresholds when nothing is configured for the pair yet.",
 *   tags={"Replenishment Policies"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="string"), description="Inventory Location public_id (ULID)"),
 *   @OA\Parameter(name="variantId", in="path", required=true, @OA\Schema(type="string"), description="Item Variant public_id (ULID)"),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Resolved policy",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *              @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *              @OA\Schema(@OA\Property(property="data", ref="#/components/schemas/ReplenishmentPolicyResponse"))
 *           }
 *       )
 *   ),
 *
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires stock.view permission"),
 *   @OA\Response(response=404, description="Inventory Location or Variant not found", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class ShowVariantReplenishmentPolicyController extends Controller
{
    public function __invoke(string $id, string $variantId, ReplenishmentPolicyResolver $resolver, OperatingUnitScope $scope): ReplenishmentPolicyResource
    {
        $location = InventoryLocation::findByPublicIdOrFail($id);

        // Horizontal authorization (#440): replenishment policies are scoped to
        // their location's Operating Unit, same as the location itself.
        $scope->assertCanAccessLocation(request()->user(), $location);

        $variant = ItemVariant::findByPublicIdOrFail($variantId);

        $policy = $resolver->resolve($location->id, $variant->id)
            ?? new VariantLocationReplenishmentPolicy(['min_stock' => 0, 'max_stock' => 0]);

        $policy->setRelation('inventoryLocation', $location);
        $policy->setRelation('itemVariant', $variant);

        return new ReplenishmentPolicyResource($policy);
    }
}
