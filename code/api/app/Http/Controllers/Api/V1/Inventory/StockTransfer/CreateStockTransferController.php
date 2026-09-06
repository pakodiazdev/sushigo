<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\StockTransfer;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\StockTransfer\StoreStockTransferRequest;
use App\Http\Resources\Inventory\StockTransfer\StockTransferResource;
use App\Services\Inventory\StockTransferService;

/**
 * @OA\Post(
 *   path="/api/v1/inventory/transfers",
 *   operationId="createStockTransfer",
 *   summary="Create a draft internal Stock Transfer",
 *   tags={"Stock Transfers"},
 *   security={{"passport": {}}},
 *
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/StoreStockTransferRequest")),
 *
 *   @OA\Response(response=201, description="Stock Transfer draft created", @OA\JsonContent(allOf={@OA\Schema(ref="#/components/schemas/ResponseEntity"), @OA\Schema(@OA\Property(property="data", ref="#/components/schemas/StockTransferResponse"))})),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires stock.manage permission and access to both endpoint Operating Units"),
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class CreateStockTransferController extends Controller
{
    public function __construct(private readonly StockTransferService $service) {}

    public function __invoke(StoreStockTransferRequest $request): StockTransferResource
    {
        $transfer = $this->service->createDraft($request->transferData());

        return (new StockTransferResource($transfer))->setStatusCode(201);
    }
}
