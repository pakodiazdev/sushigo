<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\StockMovement;

use App\Http\Controllers\Api\V1\Inventory\StockMovement\Concerns\MasksInaccessibleMovementLocations;
use App\Http\Controllers\Controller;
use App\Http\Resources\Inventory\StockMovement\StockMovementResource;
use App\Models\StockMovement;
use App\Support\Access\OperatingUnitScope;

/**
 * @OA\Get(
 *   path="/api/v1/inventory/movements/{movement}",
 *   operationId="showStockMovement",
 *   summary="Get a single immutable Stock Movement by its public ID",
 *   description="Full audit evidence for one movement: derived direction, quantity and base UOM, source/destination Locations, actor, originating source document identity, lifecycle status, and the two-way link between an original movement and its compensating reversal. A read has no Stock or ledger write side effect. Returns 403 when none of the movement's touched Locations belong to the caller's accessible Operating Units.",
 *   tags={"Stock Movements"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="movement", in="path", required=true, @OA\Schema(type="string"), description="StockMovement public_id (ULID)"),
 *
 *   @OA\Response(response=200, description="Stock movement retrieved successfully", @OA\JsonContent(allOf={@OA\Schema(ref="#/components/schemas/ResponseEntity"), @OA\Schema(@OA\Property(property="data", ref="#/components/schemas/StockMovementResponse"))})),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires stock.view permission or the movement is outside the caller's operating units"),
 *   @OA\Response(response=404, description="Stock movement not found", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class ShowStockMovementController extends Controller
{
    use MasksInaccessibleMovementLocations;

    public function __invoke(StockMovement $movement, OperatingUnitScope $scope): StockMovementResource
    {
        $user = request()->user();

        $scope->assertCanAccessStockMovement($user, $movement);

        $movement->load([
            'fromLocation' => fn ($relation) => $relation->withTrashed(),
            'toLocation' => fn ($relation) => $relation->withTrashed(),
            'itemVariant' => fn ($relation) => $relation->withTrashed()->with('unitOfMeasure'),
            'user',
            'related',
            'reverses',
            'reversal',
        ]);

        // Visible via one accessible end — hide the foreign end's Location (#574).
        $this->maskInaccessibleLocations([$movement], $scope, $user);

        return new StockMovementResource($movement);
    }
}
