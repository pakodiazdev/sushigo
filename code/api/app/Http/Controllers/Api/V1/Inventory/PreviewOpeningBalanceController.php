<?php

namespace App\Http\Controllers\Api\V1\Inventory;

use App\DataTransferObjects\Inventory\RegisterOpeningBalanceData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\RegisterOpeningBalanceRequest;
use App\Http\Responses\Common\ResponseEntity;
use App\Services\Inventory\OpeningBalanceService;

/**
 * @OA\Post(
 *   path="/api/v1/inventory/opening-balance/preview",
 *   summary="Preview an Opening Balance (no write)",
 *   description="Normalizes an opening-balance payload to the Variant's base UOM and returns the base quantity, base unit cost, and total value — the exact conversion the real posting uses, so the Existencias form's pre-submit preview matches what the ledger records. Writes nothing. Requires the same stock.manage permission and Operating Unit access as the posting endpoint.",
 *   tags={"Inventory"},
 *   security={{"passport": {}}},
 *
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/RegisterOpeningBalanceRequest")),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Normalized preview",
 *
 *       @OA\JsonContent(
 *
 *           @OA\Property(property="status", type="integer", example=200),
 *           @OA\Property(property="data", type="object",
 *               @OA\Property(property="entry_quantity", type="number", example=25000),
 *               @OA\Property(property="entry_uom", type="string", example="GR"),
 *               @OA\Property(property="base_quantity", type="number", example=25),
 *               @OA\Property(property="base_uom", type="string", example="KG"),
 *               @OA\Property(property="conversion_applies", type="boolean", example=true),
 *               @OA\Property(property="conversion_factor", type="number", example=0.001),
 *               @OA\Property(property="entry_unit_cost", type="number", nullable=true, example=0.15),
 *               @OA\Property(property="base_unit_cost", type="number", nullable=true, example=150),
 *               @OA\Property(property="total_value", type="number", nullable=true, example=3750)
 *           )
 *       )
 *   ),
 *
 *   @OA\Response(response=403, description="Missing stock.manage, or no access to the location's Operating Unit", @OA\JsonContent(ref="#/components/schemas/ResponseError")),
 *   @OA\Response(response=422, description="Validation error — unknown public ID, non-positive quantity, or no UOM conversion path to the Variant's base unit", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class PreviewOpeningBalanceController extends Controller
{
    public function __construct(private OpeningBalanceService $service) {}

    public function __invoke(RegisterOpeningBalanceRequest $request)
    {
        $preview = $this->service->previewOpeningBalance(new RegisterOpeningBalanceData(
            inventoryLocationId: $request->inventoryLocationId(),
            itemVariantId: $request->itemVariantId(),
            quantity: $request->quantity,
            entryUomId: $request->uomId(),
            unitCost: $request->unit_cost,
            userId: $request->user()->id,
        ));

        return new ResponseEntity(data: $preview, status: 200);
    }
}
