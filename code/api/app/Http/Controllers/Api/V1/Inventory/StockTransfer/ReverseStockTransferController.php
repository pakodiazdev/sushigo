<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\StockTransfer;

use App\Exceptions\StockTransferAlreadyReversedException;
use App\Exceptions\StockTransferNotPostedException;
use App\Exceptions\StockTransferReversalBoundaryException;
use App\Exceptions\StockTransferValueOutOfRangeException;
use App\Http\Controllers\Api\V1\Inventory\StockTransfer\Concerns\AssertsStockTransferOperatingUnitAccess;
use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\StockTransfer\ReverseStockTransferRequest;
use App\Http\Resources\Inventory\StockTransfer\StockTransferResource;
use App\Models\StockTransfer;
use App\Services\Inventory\StockTransferService;
use App\Support\Access\OperatingUnitScope;
use Illuminate\Http\JsonResponse;

/**
 * @OA\Post(
 *   path="/api/v1/inventory/transfers/{transfer}/reverse",
 *   operationId="reverseStockTransfer",
 *   summary="Reverse a posted internal Stock Transfer via compensating movements",
 *   tags={"Stock Transfers"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="transfer", in="path", required=true, @OA\Schema(type="string"), description="StockTransfer public_id (ULID)"),
 *
 *   @OA\RequestBody(required=false, @OA\JsonContent(ref="#/components/schemas/ReverseStockTransferRequest")),
 *
 *   @OA\Response(response=200, description="Stock Transfer reversed", @OA\JsonContent(allOf={@OA\Schema(ref="#/components/schemas/ResponseEntity"), @OA\Schema(@OA\Property(property="data", ref="#/components/schemas/StockTransferResponse"))})),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires stock.manage permission and access to both endpoint Operating Units"),
 *   @OA\Response(response=404, description="Stock Transfer not found", @OA\JsonContent(ref="#/components/schemas/ResponseError")),
 *   @OA\Response(response=409, description="Not posted, already reversed, the destination stock has fallen below the transferred quantity, or restoring the source balance would exceed the recordable range", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class ReverseStockTransferController extends Controller
{
    use AssertsStockTransferOperatingUnitAccess;

    public function __construct(private readonly StockTransferService $service) {}

    public function __invoke(ReverseStockTransferRequest $request, StockTransfer $transfer, OperatingUnitScope $scope): StockTransferResource|JsonResponse
    {
        $this->assertTransferMutable($scope, $transfer);

        try {
            $reversed = $this->service->reverseTransfer($transfer->id, $request->user()->id, $request->input('reason'));
        } catch (
            StockTransferNotPostedException
            |StockTransferAlreadyReversedException
            |StockTransferReversalBoundaryException
            |StockTransferValueOutOfRangeException $e
        ) {
            return response()->json([
                'status' => 409,
                'message' => $e->getMessage(),
                'errors' => [],
            ], 409);
        }

        return new StockTransferResource($reversed);
    }
}
