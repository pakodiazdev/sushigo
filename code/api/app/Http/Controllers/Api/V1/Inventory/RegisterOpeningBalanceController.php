<?php

namespace App\Http\Controllers\Api\V1\Inventory;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\RegisterOpeningBalanceRequest;
use App\Http\Responses\Common\ResponseEntity;
use App\Services\Inventory\OpeningBalanceService;

/**
 * @OA\Post(
 *   path="/api/v1/inventory/opening-balance",
 *   summary="Register Opening Balance",
 *   tags={"Inventory"},
 *   security={{"passport": {}}},
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/RegisterOpeningBalanceRequest")),
 *   @OA\Response(
 *       response=201,
 *       description="Opening balance registered successfully",
 *       @OA\JsonContent(
 *           @OA\Property(property="status", type="integer", example=201),
 *           @OA\Property(property="data", type="object",
 *               @OA\Property(property="id", type="integer", example=1),
 *               @OA\Property(property="inventory_location_id", type="integer", example=1),
 *               @OA\Property(property="item_variant_id", type="integer", example=1),
 *               @OA\Property(property="quantity", type="number", example=100.5),
 *               @OA\Property(property="base_quantity", type="number", example=100.5),
 *               @OA\Property(property="unit_cost", type="number", example=25.50),
 *               @OA\Property(property="reference", type="string", example="INV-2024-001"),
 *               @OA\Property(property="status", type="string", example="POSTED"),
 *               @OA\Property(property="posted_at", type="string", format="date-time")
 *           )
 *       )
 *   ),
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError")),
 *   @OA\Response(response=400, description="Business Logic Error (e.g., no conversion found)", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class RegisterOpeningBalanceController extends Controller
{
    public function __construct(private OpeningBalanceService $service)
    {
    }

    public function __invoke(RegisterOpeningBalanceRequest $request)
    {
        try {
            $movement = $this->service->registerOpeningBalance(
                inventoryLocationId: $request->inventory_location_id,
                itemVariantId: $request->item_variant_id,
                quantity: $request->quantity,
                entryUomId: $request->uom_id,
                unitCost: $request->unit_cost,
                userId: $request->user()->id,
                reference: $request->reference,
                notes: $request->notes
            );

            return new ResponseEntity(
                data: [
                    'id' => $movement->id,
                    'inventory_location_id' => $movement->to_location_id,
                    'item_variant_id' => $movement->item_variant_id,
                    'quantity' => (float) $movement->meta['original_qty'],
                    'uom' => $movement->meta['original_uom'],
                    'base_quantity' => (float) $movement->qty,
                    'base_uom' => $movement->itemVariant->unitOfMeasure->code,
                    'unit_cost' => $movement->meta['unit_cost'] ?? null,
                    'base_cost' => $movement->meta['base_cost'] ?? null,
                    'reference' => $movement->reference,
                    'notes' => $movement->notes,
                    'status' => $movement->status,
                    'posted_at' => $movement->posted_at,
                    'location' => [
                        'id' => $movement->toLocation->id,
                        'name' => $movement->toLocation->name,
                        'type' => $movement->toLocation->type,
                    ],
                    'variant' => [
                        'id' => $movement->itemVariant->id,
                        'code' => $movement->itemVariant->code,
                        'name' => $movement->itemVariant->name,
                        'item_name' => $movement->itemVariant->item->name,
                        'avg_unit_cost' => (float) $movement->itemVariant->avg_unit_cost,
                    ],
                ],
                status: 201
            );
        } catch (\Exception $e) {
            return response()->json([
                'status' => 400,
                'message' => $e->getMessage(),
                'errors' => [],
            ], 400);
        }
    }
}
