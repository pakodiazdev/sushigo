<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\VariantAssignment;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\VariantAssignment\AssignVariantToLocationRequest;
use App\Http\Resources\Inventory\VariantAssignment\VariantLocationAssignmentResource;
use App\Models\InventoryLocation;
use App\Models\ItemVariant;
use App\Models\VariantLocationAssignment;
use App\Support\Access\OperatingUnitScope;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * @OA\Put(
 *   path="/api/v1/inventory-locations/{id}/variant-assignments/{variantId}",
 *   summary="Assign a Variant to an Inventory Location",
 *   description="Idempotent. Marks the Variant as managed at this Location without creating a Stock row or a Stock Movement. Returns 201 when a live assignment is created (including reactivating a previously unassigned one), 200 when one is already live. Replenishment thresholds are untouched.",
 *   tags={"Variant Location Assignments"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="string"), description="Inventory Location public_id (ULID)"),
 *   @OA\Parameter(name="variantId", in="path", required=true, @OA\Schema(type="string"), description="Item Variant public_id (ULID)"),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Variant already assigned",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *              @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *              @OA\Schema(@OA\Property(property="data", ref="#/components/schemas/VariantLocationAssignmentResponse"))
 *           }
 *       )
 *   ),
 *
 *   @OA\Response(response=201, description="Variant assigned"),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires stock.manage permission and access to the location's Operating Unit"),
 *   @OA\Response(response=404, description="Inventory Location or Variant not found", @OA\JsonContent(ref="#/components/schemas/ResponseError")),
 *   @OA\Response(response=422, description="Variant is not active and cannot be managed at a location", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class AssignVariantToLocationController extends Controller
{
    public function __invoke(
        AssignVariantToLocationRequest $request,
        string $id,
        string $variantId,
        OperatingUnitScope $scope
    ): VariantLocationAssignmentResource {
        $location = InventoryLocation::findByPublicIdOrFail($id);

        // Horizontal authorization (#440): assignments are scoped to their
        // location's Operating Unit, same as the location itself.
        $scope->assertCanAccessLocation($request->user(), $location);

        $variant = ItemVariant::findByPublicIdOrFail($variantId);

        // Same active-catalog predicate the list endpoint applies: an inactive
        // Variant is outside the manageable catalog, so the write path rejects
        // it too rather than creating an assignment the panel can never show or
        // remove.
        if (! $variant->is_active) {
            throw ValidationException::withMessages([
                'variantId' => 'This variant is not active and cannot be managed at a location.',
            ]);
        }

        [$assignment, $created] = $this->assignOrRecover($location->id, $variant->id);

        $variant->setAttribute('assignment_public_id', $assignment->public_id);
        $variant->setAttribute('assigned_at', $assignment->created_at?->toIso8601String());
        $variant->setAttribute('location_public_id', $location->public_id);

        return (new VariantLocationAssignmentResource($variant))->setStatusCode($created ? 201 : 200);
    }

    /**
     * Idempotently land a live assignment for the pair.
     *
     * @return array{0: VariantLocationAssignment, 1: bool} the assignment and whether this call created/reactivated it
     */
    private function assignOrRecover(int $locationId, int $variantId): array
    {
        $existing = VariantLocationAssignment::withTrashed()
            ->where('inventory_location_id', $locationId)
            ->where('item_variant_id', $variantId)
            ->first();

        if ($existing === null) {
            return $this->insertOrRecoverLive($locationId, $variantId);
        }

        $reactivated = $existing->trashed();

        if ($reactivated) {
            $existing->restore();
        }

        return [$existing, $reactivated];
    }

    /**
     * First live insert for the pair, recovering from the partial-unique-index
     * race two concurrent PUTs for the same unassigned pair would otherwise
     * lose (one INSERT would surface a raw DB error instead of the promised
     * 200/201). Same savepoint/recover shape as
     * StockMutationService::insertOrRecoverFromRace().
     *
     * @return array{0: VariantLocationAssignment, 1: bool}
     */
    private function insertOrRecoverLive(int $locationId, int $variantId): array
    {
        try {
            $assignment = DB::transaction(fn () => VariantLocationAssignment::create([
                'inventory_location_id' => $locationId,
                'item_variant_id' => $variantId,
            ]));

            return [$assignment, true];
        } catch (UniqueConstraintViolationException) {
            // A concurrent PUT won the insert between our read and ours.
            $winner = VariantLocationAssignment::query()
                ->where('inventory_location_id', $locationId)
                ->where('item_variant_id', $variantId)
                ->firstOrFail();

            return [$winner, false];
        }
    }
}
