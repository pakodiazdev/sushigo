<?php

namespace App\Http\Controllers\Api\V1\InventoryLocation;

use App\Http\Controllers\Api\V1\InventoryLocation\Concerns\FormatsInventoryLocation;
use App\Http\Controllers\Controller;
use App\Http\Requests\InventoryLocation\CreateInventoryLocationRequest;
use App\Http\Responses\Common\ResponseEntity;
use App\Models\InventoryLocation;

/**
 * @OA\Post(
 *   path="/api/v1/inventory-locations",
 *   summary="Create Inventory Location",
 *   tags={"Inventory Locations"},
 *   security={{"passport": {}}},
 *
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/CreateInventoryLocationRequest")),
 *
 *   @OA\Response(response=201, description="Created", @OA\JsonContent(ref="#/components/schemas/ResponseEntity")),
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError")),
 * )
 */
class CreateInventoryLocationController extends Controller
{
    use FormatsInventoryLocation;

    public function __invoke(CreateInventoryLocationRequest $request)
    {
        $location = InventoryLocation::create([
            'operating_unit_id' => $request->operating_unit_id,
            'name' => $request->name,
            'type' => $request->type,
            'priority' => $request->input('priority', 100),
            'is_primary' => $request->input('is_primary', false),
            'is_active' => $request->input('is_active', true),
            'notes' => $request->notes,
        ]);

        $location->load(['operatingUnit.branch']);

        return new ResponseEntity(
            data: [
                ...$this->baseLocationData($location),
                'created_at' => $location->created_at,
            ],
            status: 201
        );
    }
}
