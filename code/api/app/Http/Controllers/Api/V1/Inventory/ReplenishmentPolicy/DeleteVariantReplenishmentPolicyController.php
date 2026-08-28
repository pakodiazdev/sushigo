<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\ReplenishmentPolicy;

use App\Http\Controllers\Controller;
use App\Models\InventoryLocation;
use App\Models\ItemVariant;
use App\Models\VariantLocationReplenishmentPolicy;
use App\Support\Access\OperatingUnitScope;
use Illuminate\Http\Response;

/**
 * @OA\Delete(
 *   path="/api/v1/inventory-locations/{id}/replenishment-policies/{variantId}",
 *   summary="Remove the replenishment policy for a Variant at an Inventory Location",
 *   description="Soft-deletes the policy row. After this the pair resolves to 'no policy' and its stock is no longer eligible for low-stock alerts.",
 *   tags={"Replenishment Policies"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="string"), description="Inventory Location public_id (ULID)"),
 *   @OA\Parameter(name="variantId", in="path", required=true, @OA\Schema(type="string"), description="Item Variant public_id (ULID)"),
 *
 *   @OA\Response(response=204, description="Policy removed"),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires stock.manage permission"),
 *   @OA\Response(response=404, description="Inventory Location, Variant, or policy not found", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class DeleteVariantReplenishmentPolicyController extends Controller
{
    public function __invoke(string $id, string $variantId, OperatingUnitScope $scope): Response
    {
        $location = InventoryLocation::findByPublicIdOrFail($id);

        // Horizontal authorization (#440): replenishment policies are scoped to
        // their location's Operating Unit, same as the location itself.
        $scope->assertCanAccessLocation(request()->user(), $location);

        $variant = ItemVariant::findByPublicIdOrFail($variantId);

        $policy = VariantLocationReplenishmentPolicy::query()
            ->where('inventory_location_id', $location->id)
            ->where('item_variant_id', $variant->id)
            ->firstOrFail();

        $policy->delete();

        return response()->noContent();
    }
}
