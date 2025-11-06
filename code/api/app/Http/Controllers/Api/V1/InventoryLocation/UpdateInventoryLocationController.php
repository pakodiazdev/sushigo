<?php

namespace App\Http\Controllers\Api\V1\InventoryLocation;

use App\Http\Controllers\Controller;
use App\Http\Requests\InventoryLocation\UpdateInventoryLocationRequest;
use App\Http\Responses\Common\ResponseEntity;
use App\Models\InventoryLocation;

/**
 * @OA\Put(
 *   path="/api/v1/inventory-locations/{id}",
 *   summary="Update Inventory Location",
 *   tags={"Inventory Locations"},
 *   security={{"passport": {}}},
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/UpdateInventoryLocationRequest")),
 *   @OA\Response(response=200, description="Success", @OA\JsonContent(ref="#/components/schemas/ResponseEntity")),
 *   @OA\Response(response=404, description="Not Found", @OA\JsonContent(ref="#/components/schemas/ResponseError")),
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError")),
 * )
 */
class UpdateInventoryLocationController extends Controller
{
    public function __invoke(UpdateInventoryLocationRequest $request, int $id)
    {
        $location = InventoryLocation::findOrFail($id);

        $location->update($request->only([
            'name',
            'type',
            'priority',
            'is_primary',
            'is_active',
            'notes',
        ]));

        $location->load(['operatingUnit.branch']);

        return new ResponseEntity(
            data: [
                'id' => $location->id,
                'operating_unit_id' => $location->operating_unit_id,
                'name' => $location->name,
                'type' => $location->type,
                'priority' => $location->priority,
                'is_primary' => $location->is_primary,
                'is_active' => $location->is_active,
                'notes' => $location->notes,
                'operating_unit' => [
                    'id' => $location->operatingUnit->id,
                    'name' => $location->operatingUnit->name,
                    'type' => $location->operatingUnit->type,
                ],
                'updated_at' => $location->updated_at,
            ]
        );
    }
}
