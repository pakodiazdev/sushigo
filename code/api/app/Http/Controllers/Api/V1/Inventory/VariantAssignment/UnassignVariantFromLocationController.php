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

        // The balance check and the soft-delete run in one transaction, and the
        // assignment row is locked before Stock, matching StockMutationService.
        // The assignment therefore serializes the pair even when no Stock row
        // exists yet: after waiting for an overlapping first inbound entry, this
        // transaction re-reads its newly committed positive balance and returns
        // 409 instead of hiding it from the managed-assortment list.
        $blocked = DB::transaction(function () use ($location, $variant): bool {
            $assignment = VariantLocationAssignment::query()
                ->where('inventory_location_id', $location->id)
                ->where('item_variant_id', $variant->id)
                ->lockForUpdate()
                ->firstOrFail();

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
