<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\Receipt;

use App\Http\Controllers\Api\V1\Inventory\Receipt\Concerns\AssertsReceiptOperatingUnitAccess;
use App\Http\Controllers\Controller;
use App\Http\Resources\Inventory\Receipt\ReceiptResource;
use App\Models\Receipt;
use App\Support\Access\OperatingUnitScope;

/**
 * @OA\Get(
 *   path="/api/v1/inventory/receipts/{receipt}",
 *   operationId="showReceipt",
 *   summary="Get a Purchase Receipt by ID",
 *   tags={"Receipts"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="receipt", in="path", required=true, @OA\Schema(type="string"), description="Receipt public_id (ULID)"),
 *
 *   @OA\Response(response=200, description="Receipt retrieved successfully", @OA\JsonContent(allOf={@OA\Schema(ref="#/components/schemas/ResponseEntity"), @OA\Schema(@OA\Property(property="data", ref="#/components/schemas/ReceiptResponse"))})),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires receipts.view permission"),
 *   @OA\Response(response=404, description="Receipt not found", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class ShowReceiptController extends Controller
{
    use AssertsReceiptOperatingUnitAccess;

    public function __invoke(Receipt $receipt, OperatingUnitScope $scope): ReceiptResource
    {
        $this->assertReceiptInScope($scope, $receipt);

        return new ReceiptResource($receipt->load([
            'supplier',
            'destinationLocation.operatingUnit',
            'lines.presentation.itemVariant',
            'lines.supplierOffering',
            'postedByUser',
            'reversedByUser',
        ]));
    }
}
