<?php

namespace App\Http\Controllers\Api\V1\InventoryLocation;

use App\Http\Controllers\Controller;
use App\Http\Responses\Common\ResponseEntity;
use App\Models\InventoryLocation;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

/**
 * @OA\Delete(
 *   path="/api/v1/inventory-locations/{id}",
 *   summary="Delete Inventory Location",
 *   tags={"Inventory Locations"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="string"), description="Inventory Location public_id (ULID)"),
 *
 *   @OA\Response(response=200, description="Success", @OA\JsonContent(ref="#/components/schemas/ResponseEntity")),
 *   @OA\Response(response=403, description="Forbidden — caller is not an active member of the location's Operating Unit"),
 *   @OA\Response(response=404, description="Not Found", @OA\JsonContent(ref="#/components/schemas/ResponseError")),
 *   @OA\Response(response=409, description="Conflict - Location has stock", @OA\JsonContent(ref="#/components/schemas/ResponseError")),
 * )
 */
class DeleteInventoryLocationController extends Controller
{
    public function __invoke(string $id)
    {
        $location = InventoryLocation::findByPublicIdOrFail($id);

        // Horizontal authorization (#440): manage permission is not enough —
        // the user must belong to this location's Operating Unit.
        Gate::authorize('delete', $location);

        // Re-check "has stock" under a row lock, then soft-delete in the same
        // transaction. A Stock Transfer (or any inbound move) posting into this
        // location takes the same `inventory_locations` row lock via
        // StockTransferService::lockEndpoints(); without serializing here, a
        // delete that saw an empty location could still archive it right after a
        // concurrent post moved stock in, stranding that stock under a
        // soft-deleted location.
        $deleted = DB::transaction(function () use ($location): bool {
            /** @var InventoryLocation $locked */
            $locked = InventoryLocation::whereKey($location->getKey())->lockForUpdate()->firstOrFail();

            if ($locked->stock()->where('on_hand', '>', 0)->exists()) {
                return false;
            }

            $locked->delete();

            return true;
        });

        if (! $deleted) {
            return response()->json([
                'status' => 409,
                'message' => 'Cannot delete location that has stock on hand. Move or consume stock first.',
                'errors' => [],
            ], 409);
        }

        return new ResponseEntity(
            data: ['message' => 'Inventory location deleted successfully']
        );
    }
}
