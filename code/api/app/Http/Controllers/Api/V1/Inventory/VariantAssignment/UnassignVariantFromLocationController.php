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

        $assignment = VariantLocationAssignment::query()
            ->where('inventory_location_id', $location->id)
            ->where('item_variant_id', $variant->id)
            ->firstOrFail();

        // The balance check and the soft-delete run in one transaction, and the
        // check locks the pair's Stock row itself — by (location, variant) only,
        // never filtered by quantity — so a *zeroed* row is locked too. That is
        // the same row the inbound posting path locks
        // (StockMutationService::lockAndGet), so a concurrent receipt into an
        // existing row for the pair (zero balance included) is serialized
        // against this guard and the documented 409 invariant holds. A genuine
        // first receipt that creates the Stock row from scratch in the same
        // instant still has no row to lock — enforcing assortment against
        // inbound entries is explicitly a consuming-workflow concern
        // (#570–#574), out of scope here.
        $blocked = DB::transaction(function () use ($location, $variant, $assignment): bool {
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
