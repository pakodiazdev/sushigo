<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\StockTransfer;

use App\Exceptions\StockTransferAlreadyPostedException;
use App\Http\Controllers\Api\V1\Inventory\StockTransfer\Concerns\AssertsStockTransferOperatingUnitAccess;
use App\Http\Controllers\Controller;
use App\Models\StockTransfer;
use App\Services\Inventory\StockTransferService;
use App\Support\Access\OperatingUnitScope;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

/**
 * @OA\Delete(
 *   path="/api/v1/inventory/transfers/{transfer}",
 *   operationId="deleteStockTransfer",
 *   summary="Soft-delete a draft internal Stock Transfer",
 *   tags={"Stock Transfers"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="transfer", in="path", required=true, @OA\Schema(type="string"), description="StockTransfer public_id (ULID)"),
 *
 *   @OA\Response(response=204, description="Stock Transfer deleted"),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires stock.manage permission and access to both endpoint Operating Units"),
 *   @OA\Response(response=404, description="Stock Transfer not found", @OA\JsonContent(ref="#/components/schemas/ResponseError")),
 *   @OA\Response(response=409, description="Cannot delete — Stock Transfer is not a draft", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class DeleteStockTransferController extends Controller
{
    use AssertsStockTransferOperatingUnitAccess;

    public function __construct(private readonly StockTransferService $service) {}

    public function __invoke(StockTransfer $transfer, OperatingUnitScope $scope): Response|JsonResponse
    {
        $this->assertTransferMutable($scope, $transfer);

        try {
            $this->service->deleteDraft($transfer->id, request()->user()->id);
        } catch (StockTransferAlreadyPostedException) {
            return response()->json([
                'status' => 409,
                'message' => 'Cannot delete a Stock Transfer that is not a draft.',
                'errors' => [],
            ], 409);
        }

        return response()->noContent();
    }
}
