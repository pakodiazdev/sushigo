<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\VariantAssignment;

use App\Http\Controllers\Controller;
use App\Models\InventoryLocation;
use App\Models\ItemVariant;
use App\Models\Stock;
use App\Models\VariantLocationAssignment;
use App\Support\Access\OperatingUnitScope;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

/**
 * @OA\Delete(
 *   path="/api/v1/inventory-locations/{id}/variant-assignments/{variantId}",
 *   summary="Unassign a Variant from an Inventory Location",
 *   description="Soft-deletes the live assignment so the pair stops counting as managed here, while keeping the audit trail for a later reactivation. Blocked with 409 while the pair still holds on-hand or reserved Stock — physical balance must be moved or consumed first. Replenishment thresholds are untouched.",
 *   tags={"Variant Location Assignments"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="string"), description="Inventory Location public_id (ULID)"),
 *   @OA\Parameter(name="variantId", in="path", required=true, @OA\Schema(type="string"), description="Item Variant public_id (ULID)"),
 *
 *   @OA\Response(response=204, description="Variant unassigned"),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires stock.manage permission and access to the location's Operating Unit"),
 *   @OA\Response(response=404, description="Inventory Location, Variant, or live assignment not found", @OA\JsonContent(ref="#/components/schemas/ResponseError")),
 *   @OA\Response(response=409, description="Conflict — the pair still holds on-hand or reserved Stock", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class UnassignVariantFromLocationController extends Controller
{
    public function __invoke(
        string $id,
        string $variantId,
        OperatingUnitScope $scope
    ): Response|JsonResponse {
        $location = InventoryLocation::findByPublicIdOrFail($id);

        // Horizontal authorization (#440): assignments are scoped to their
        // location's Operating Unit, same as the location itself.
        $scope->assertCanAccessLocation(request()->user(), $location);

        $variant = ItemVariant::findByPublicIdOrFail($variantId);

        VariantLocationAssignment::query()
            ->where('inventory_location_id', $location->id)
            ->where('item_variant_id', $variant->id)
            ->firstOrFail();

        // Everything runs in one transaction with a fixed lock order —
        // **assignment row first, then the pair's Stock row** — the same order
        // the inbound Receipt posting path takes (`ReceiptService::postReceipt`:
        // `VariantLocationAssignmentEnsurer::ensure()` locks the assignment,
        // *then* `StockMutationService` locks/creates the Stock row). Sharing the
        // order both keeps the two paths deadlock-free and forces whichever grabs
        // the assignment lock first to finish before the other proceeds:
        //
        //  - unassign wins the assignment lock → the receipt's `ensure()` waits;
        //    unassign soft-deletes, commits, and the receipt then re-reads no
        //    live row and *reactivates* the assignment, so the confirmed receipt
        //    still lands inside the managed assortment;
        //  - the receipt wins → unassign waits until the receipt commits, then
        //    sees the now-positive Stock row and returns 409.
        //
        // This closes the first-receipt race (`#572`): a brand-new Stock row is
        // invisible to unassign's balance check, but the assignment-row lock is
        // not, so the two are still serialized.
        $blocked = DB::transaction(function () use ($location, $variant): bool {
            $assignment = VariantLocationAssignment::query()
                ->where('inventory_location_id', $location->id)
                ->where('item_variant_id', $variant->id)
                ->lockForUpdate()
                ->first();

            if ($assignment === null) {
                // A concurrent unassign won between the pre-flight check and this
                // lock — nothing left to do, the pair is already unassigned.
                return false;
            }

            $stock = Stock::query()
                ->where('inventory_location_id', $location->id)
                ->where('item_variant_id', $variant->id)
                ->lockForUpdate()
                ->first();

            if ($stock !== null && ((float) $stock->on_hand > 0 || (float) $stock->reserved > 0)) {
                return true;
            }

            $assignment->delete();

            return false;
        });

        if ($blocked) {
            return response()->json([
                'status' => 409,
                'message' => 'Cannot unassign a Variant that still has on-hand or reserved stock at this location. Move or consume the balance first.',
                'errors' => [],
            ], 409);
        }

        return response()->noContent();
    }
}
