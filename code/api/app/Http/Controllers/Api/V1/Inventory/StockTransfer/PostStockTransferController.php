<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\StockTransfer;

use App\Exceptions\StockTransferAlreadyPostedException;
use App\Exceptions\StockTransferAlreadyReversedException;
use App\Exceptions\StockTransferInsufficientStockException;
use App\Exceptions\StockTransferLocationUnavailableException;
use App\Exceptions\StockTransferValueOutOfRangeException;
use App\Exceptions\StockTransferVariantNotAssignedException;
use App\Exceptions\StockTransferVariantUnavailableException;
use App\Http\Controllers\Api\V1\Inventory\StockTransfer\Concerns\AssertsStockTransferOperatingUnitAccess;
use App\Http\Controllers\Controller;
use App\Http\Resources\Inventory\StockTransfer\StockTransferResource;
use App\Models\StockTransfer;
use App\Services\Inventory\StockTransferService;
use App\Support\Access\OperatingUnitScope;
use Illuminate\Http\JsonResponse;

/**
 * @OA\Post(
 *   path="/api/v1/inventory/transfers/{transfer}/post",
 *   operationId="postStockTransfer",
 *   summary="Post a draft internal Stock Transfer — move stock between Locations",
 *   tags={"Stock Transfers"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="transfer", in="path", required=true, @OA\Schema(type="string"), description="StockTransfer public_id (ULID)"),
 *
 *   @OA\Response(response=200, description="Stock Transfer posted", @OA\JsonContent(allOf={@OA\Schema(ref="#/components/schemas/ResponseEntity"), @OA\Schema(@OA\Property(property="data", ref="#/components/schemas/StockTransferResponse"))})),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires stock.manage permission and access to both endpoint Operating Units"),
 *   @OA\Response(response=404, description="Stock Transfer not found", @OA\JsonContent(ref="#/components/schemas/ResponseError")),
 *   @OA\Response(response=409, description="Already posted/reversed, an endpoint Location or Product Variant is unavailable, a Variant is not assigned to the destination, the source has insufficient unreserved stock, or a line's value exceeds the recordable range", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class PostStockTransferController extends Controller
{
    use AssertsStockTransferOperatingUnitAccess;

    public function __construct(private readonly StockTransferService $service) {}

    public function __invoke(StockTransfer $transfer, OperatingUnitScope $scope): StockTransferResource|JsonResponse
    {
        $this->assertTransferMutable($scope, $transfer);

        try {
            $posted = $this->service->postTransfer($transfer->id, request()->user()->id);
        } catch (
            StockTransferAlreadyPostedException
            |StockTransferAlreadyReversedException
            |StockTransferLocationUnavailableException
            |StockTransferVariantUnavailableException
            |StockTransferVariantNotAssignedException
            |StockTransferInsufficientStockException
            |StockTransferValueOutOfRangeException $e
        ) {
            return response()->json([
                'status' => 409,
                'message' => $e->getMessage(),
                'errors' => [],
            ], 409);
        }

        return new StockTransferResource($posted);
    }
}
