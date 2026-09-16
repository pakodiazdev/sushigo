<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\StockTransfer;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\StockTransfer\PreviewStockTransferLineRequest;
use App\Http\Responses\Common\ResponseEntity;
use App\Services\Inventory\StockTransferService;

/**
 * @OA\Post(
 *   path="/api/v1/inventory/transfers/preview",
 *   operationId="previewStockTransferLine",
 *   summary="Preview a Stock Transfer line (no write)",
 *   description="Non-authoritative preview (#613): the source Location's current on-hand/reserved/available for the Variant, plus the base-UOM quantity the line would move if posted. Indicative only — the authoritative check happens under lock at post time. Writes nothing.",
 *   tags={"Stock Transfers"},
 *   security={{"passport": {}}},
 *
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/PreviewStockTransferLineRequest")),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Non-authoritative preview",
 *
 *       @OA\JsonContent(
 *
 *           @OA\Property(property="status", type="integer", example=200),
 *           @OA\Property(property="data", type="object",
 *               @OA\Property(property="source_on_hand", type="number", example=120),
 *               @OA\Property(property="source_reserved", type="number", example=10),
 *               @OA\Property(property="source_available", type="number", example=110),
 *               @OA\Property(property="entry_quantity", type="number", example=5),
 *               @OA\Property(property="entry_uom", type="string", example="CJ"),
 *               @OA\Property(property="base_quantity", type="number", example=60),
 *               @OA\Property(property="base_uom", type="string", example="PZ"),
 *               @OA\Property(property="conversion_applies", type="boolean", example=true),
 *               @OA\Property(property="conversion_factor", type="number", example=12)
 *           )
 *       )
 *   ),
 *
 *   @OA\Response(response=403, description="Missing stock.manage, or no access to the source location's Operating Unit", @OA\JsonContent(ref="#/components/schemas/ResponseError")),
 *   @OA\Response(response=422, description="Validation error — unknown public ID, non-positive quantity, or no UOM conversion path to the Variant's base unit", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class PreviewStockTransferLineController extends Controller
{
    public function __construct(private readonly StockTransferService $service) {}

    public function __invoke(PreviewStockTransferLineRequest $request)
    {
        $preview = $this->service->previewLine($request->previewData());

        return new ResponseEntity(data: $preview, status: 200);
    }
}
