<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\Receipt;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\Receipt\StoreReceiptRequest;
use App\Http\Resources\Inventory\Receipt\ReceiptResource;
use App\Services\Inventory\ReceiptService;

/**
 * @OA\Post(
 *   path="/api/v1/inventory/receipts",
 *   operationId="createReceipt",
 *   summary="Create a draft Purchase Receipt",
 *   tags={"Receipts"},
 *   security={{"passport": {}}},
 *
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/StoreReceiptRequest")),
 *
 *   @OA\Response(response=201, description="Receipt draft created successfully", @OA\JsonContent(allOf={@OA\Schema(ref="#/components/schemas/ResponseEntity"), @OA\Schema(@OA\Property(property="data", ref="#/components/schemas/ReceiptResponse"))})),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires receipts.manage permission"),
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class CreateReceiptController extends Controller
{
    public function __construct(private readonly ReceiptService $service) {}

    public function __invoke(StoreReceiptRequest $request): ReceiptResource
    {
        $receipt = $this->service->createDraft($request->receiptData());

        return (new ReceiptResource($receipt))->setStatusCode(201);
    }
}
