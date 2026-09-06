<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\StockTransfer;

use App\Http\Controllers\Api\V1\Inventory\StockTransfer\Concerns\AssertsStockTransferOperatingUnitAccess;
use App\Http\Controllers\Controller;
use App\Http\Resources\Inventory\StockTransfer\StockTransferResource;
use App\Models\StockTransfer;
use App\Support\Access\OperatingUnitScope;

/**
 * @OA\Get(
 *   path="/api/v1/inventory/transfers/{transfer}",
 *   operationId="showStockTransfer",
 *   summary="Get an internal Stock Transfer by ID",
 *   tags={"Stock Transfers"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="transfer", in="path", required=true, @OA\Schema(type="string"), description="StockTransfer public_id (ULID)"),
 *
 *   @OA\Response(response=200, description="Stock Transfer retrieved successfully", @OA\JsonContent(allOf={@OA\Schema(ref="#/components/schemas/ResponseEntity"), @OA\Schema(@OA\Property(property="data", ref="#/components/schemas/StockTransferResponse"))})),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires stock.view permission"),
 *   @OA\Response(response=404, description="Stock Transfer not found", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class ShowStockTransferController extends Controller
{
    use AssertsStockTransferOperatingUnitAccess;

    public function __invoke(StockTransfer $transfer, OperatingUnitScope $scope): StockTransferResource
    {
        $this->assertTransferReadable($scope, $transfer);

        return new StockTransferResource($transfer->load([
            'sourceLocation',
            'destinationLocation',
            'lines.itemVariant',
            'lines.entryUom',
            'postedByUser',
            'reversedByUser',
        ]));
    }
}
