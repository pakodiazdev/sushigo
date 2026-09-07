<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\StockTransfer;

use App\Exceptions\StockTransferAlreadyPostedException;
use App\Http\Controllers\Api\V1\Inventory\StockTransfer\Concerns\AssertsStockTransferOperatingUnitAccess;
use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\StockTransfer\UpdateStockTransferRequest;
use App\Http\Resources\Inventory\StockTransfer\StockTransferResource;
use App\Models\StockTransfer;
use App\Services\Inventory\StockTransferService;
use App\Support\Access\OperatingUnitScope;
use Illuminate\Http\JsonResponse;

/**
 * @OA\Put(
 *   path="/api/v1/inventory/transfers/{transfer}",
 *   operationId="updateStockTransfer",
 *   summary="Update a draft internal Stock Transfer (header + lines, full replace)",
 *   tags={"Stock Transfers"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="transfer", in="path", required=true, @OA\Schema(type="string"), description="StockTransfer public_id (ULID)"),
 *
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/UpdateStockTransferRequest")),
 *
 *   @OA\Response(response=200, description="Stock Transfer updated", @OA\JsonContent(allOf={@OA\Schema(ref="#/components/schemas/ResponseEntity"), @OA\Schema(@OA\Property(property="data", ref="#/components/schemas/StockTransferResponse"))})),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires stock.manage permission and access to both endpoint Operating Units"),
 *   @OA\Response(response=404, description="Stock Transfer not found", @OA\JsonContent(ref="#/components/schemas/ResponseError")),
 *   @OA\Response(response=409, description="Cannot edit — Stock Transfer is not a draft", @OA\JsonContent(ref="#/components/schemas/ResponseError")),
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class UpdateStockTransferController extends Controller
{
    use AssertsStockTransferOperatingUnitAccess;

    public function __construct(private readonly StockTransferService $service) {}

    public function __invoke(UpdateStockTransferRequest $request, StockTransfer $transfer, OperatingUnitScope $scope): StockTransferResource|JsonResponse
    {
        $this->assertTransferMutable($scope, $transfer);

        try {
            $updated = $this->service->updateDraft($transfer->id, $request->transferData());
        } catch (StockTransferAlreadyPostedException $e) {
            return response()->json([
                'status' => 409,
                'message' => $e->getMessage(),
                'errors' => [],
            ], 409);
        }

        return new StockTransferResource($updated);
    }
}
