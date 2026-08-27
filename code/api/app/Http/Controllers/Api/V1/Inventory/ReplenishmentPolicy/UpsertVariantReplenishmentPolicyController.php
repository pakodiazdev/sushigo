<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\ReplenishmentPolicy;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\ReplenishmentPolicy\UpsertReplenishmentPolicyRequest;
use App\Http\Resources\Inventory\ReplenishmentPolicy\ReplenishmentPolicyResource;
use App\Models\InventoryLocation;
use App\Models\ItemVariant;
use App\Models\VariantLocationReplenishmentPolicy;

/**
 * @OA\Put(
 *   path="/api/v1/inventory-locations/{id}/replenishment-policies/{variantId}",
 *   summary="Create or update the replenishment policy for a Variant at an Inventory Location",
 *   description="Idempotent upsert keyed on the (location, variant) pair. Returns 201 when a new policy is created, 200 when an existing one is updated.",
 *   tags={"Replenishment Policies"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="string"), description="Inventory Location public_id (ULID)"),
 *   @OA\Parameter(name="variantId", in="path", required=true, @OA\Schema(type="string"), description="Item Variant public_id (ULID)"),
 *
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/UpsertReplenishmentPolicyRequest")),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Policy updated",
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
 *   @OA\Response(response=201, description="Policy created"),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires stock.manage permission"),
 *   @OA\Response(response=404, description="Inventory Location or Variant not found", @OA\JsonContent(ref="#/components/schemas/ResponseError")),
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class UpsertVariantReplenishmentPolicyController extends Controller
{
    public function __invoke(UpsertReplenishmentPolicyRequest $request, string $id, string $variantId): ReplenishmentPolicyResource
    {
        $location = InventoryLocation::findByPublicIdOrFail($id);
        $variant = ItemVariant::findByPublicIdOrFail($variantId);

        $existing = VariantLocationReplenishmentPolicy::query()
            ->where('inventory_location_id', $location->id)
            ->where('item_variant_id', $variant->id)
            ->first();

        $policy = VariantLocationReplenishmentPolicy::updateOrCreate(
            ['inventory_location_id' => $location->id, 'item_variant_id' => $variant->id],
            [...$request->policyData(), 'meta' => $existing?->meta ?? []],
        );

        $policy->setRelation('inventoryLocation', $location);
        $policy->setRelation('itemVariant', $variant);

        return (new ReplenishmentPolicyResource($policy))->setStatusCode($existing ? 200 : 201);
    }
}
