<?php

namespace App\Http\Controllers\Api\V1\Inventory;

use App\DataTransferObjects\Inventory\RegisterOpeningBalanceData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\RegisterOpeningBalanceRequest;
use App\Http\Responses\Common\ResponseEntity;
use App\Models\Stock;
use App\Services\Inventory\OpeningBalanceService;

/**
 * @OA\Post(
 *   path="/api/v1/inventory/opening-balance",
 *   summary="Register Opening Balance",
 *   description="Posts an immediate, immutable OPENING_BALANCE stock movement into an active, accessible Inventory Location, ensures the Variant-to-Location assignment in the same transaction, and blends the destination Stock's weighted-average cost. Initialization only — not a supplier receipt and not a draft document. Repeated entries are auditable additions; corrections use reversal/adjustment, never in-place edits.",
 *   tags={"Inventory"},
 *   security={{"passport": {}}},
 *
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/RegisterOpeningBalanceRequest")),
 *
 *   @OA\Response(
 *       response=201,
 *       description="Opening balance posted",
 *
 *       @OA\JsonContent(
 *
 *           @OA\Property(property="status", type="integer", example=201),
 *           @OA\Property(property="data", type="object",
 *               @OA\Property(property="id", type="integer", example=42),
 *               @OA\Property(property="inventory_location_id", type="integer", example=7),
 *               @OA\Property(property="item_variant_id", type="integer", example=13),
 *               @OA\Property(property="quantity", type="number", example=25000),
 *               @OA\Property(property="uom", type="string", example="GR"),
 *               @OA\Property(property="base_quantity", type="number", example=25),
 *               @OA\Property(property="base_uom", type="string", example="KG"),
 *               @OA\Property(property="unit_cost", type="number", nullable=true, example=0.15),
 *               @OA\Property(property="base_cost", type="number", nullable=true, example=150),
 *               @OA\Property(property="reference", type="string", nullable=true, example="INV-2026-001"),
 *               @OA\Property(property="notes", type="string", nullable=true),
 *               @OA\Property(property="status", type="string", example="POSTED"),
 *               @OA\Property(property="posted_at", type="string", format="date-time"),
 *               @OA\Property(property="location", type="object",
 *                   @OA\Property(property="id", type="integer", example=7),
 *                   @OA\Property(property="name", type="string", example="Main Warehouse"),
 *                   @OA\Property(property="type", type="string", example="MAIN")
 *               ),
 *               @OA\Property(property="variant", type="object",
 *                   @OA\Property(property="id", type="integer", example=13),
 *                   @OA\Property(property="code", type="string", example="VAR-013"),
 *                   @OA\Property(property="name", type="string", example="Rice White 1kg"),
 *                   @OA\Property(property="item_name", type="string", example="Rice"),
 *                   @OA\Property(property="weighted_avg_cost", type="number", example=150)
 *               )
 *           )
 *       )
 *   ),
 *
 *   @OA\Response(response=403, description="Missing stock.manage, or no access to the destination location's Operating Unit", @OA\JsonContent(ref="#/components/schemas/ResponseError")),
 *   @OA\Response(response=422, description="Validation error — unknown public ID, non-positive quantity, inactive destination location, or no UOM conversion path to the Variant's base unit", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class RegisterOpeningBalanceController extends Controller
{
    public function __construct(private OpeningBalanceService $service) {}

    public function __invoke(RegisterOpeningBalanceRequest $request)
    {
        // Authorization (403), validation and business conflicts (422) are
        // surfaced as their own status codes by the FormRequest and by typed
        // exceptions the Service throws (#570) — this controller no longer
        // collapses every failure into a generic 400.
        $movement = $this->service->registerOpeningBalance(new RegisterOpeningBalanceData(
            inventoryLocationId: $request->inventoryLocationId(),
            itemVariantId: $request->itemVariantId(),
            quantity: $request->quantity,
            entryUomId: $request->uomId(),
            unitCost: $request->unit_cost,
            userId: $request->user()->id,
            reference: $request->reference,
            notes: $request->notes
        ));

        // Weighted-average cost (#434) lives on Stock, per Inventory
        // Location — never on ItemVariant, which is read-only for
        // acquisition cost.
        $weightedAvgCost = Stock::where('inventory_location_id', $movement->to_location_id)
            ->where('item_variant_id', $movement->item_variant_id)
            ->value('weighted_avg_cost');

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
                    'weighted_avg_cost' => (float) ($weightedAvgCost ?? 0),
                ],
            ],
            status: 201
        );
    }
}
