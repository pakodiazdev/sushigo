<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\Receipt;

use App\Exceptions\ReceiptAlreadyPostedException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\Receipt\UpdateReceiptRequest;
use App\Http\Resources\Inventory\Receipt\ReceiptResource;
use App\Models\Receipt;
use App\Services\Inventory\ReceiptService;
use Illuminate\Http\JsonResponse;

/**
 * @OA\Put(
 *   path="/api/v1/inventory/receipts/{receipt}",
 *   operationId="updateReceipt",
 *   summary="Update a draft Purchase Receipt (header + lines, full replace)",
 *   tags={"Receipts"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="receipt", in="path", required=true, @OA\Schema(type="string"), description="Receipt public_id (ULID)"),
 *
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/UpdateReceiptRequest")),
 *
 *   @OA\Response(response=200, description="Receipt updated successfully", @OA\JsonContent(allOf={@OA\Schema(ref="#/components/schemas/ResponseEntity"), @OA\Schema(@OA\Property(property="data", ref="#/components/schemas/ReceiptResponse"))})),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires receipts.manage permission"),
 *   @OA\Response(response=404, description="Receipt not found", @OA\JsonContent(ref="#/components/schemas/ResponseError")),
 *   @OA\Response(response=409, description="Cannot edit — Receipt is not a draft", @OA\JsonContent(ref="#/components/schemas/ResponseError")),
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class UpdateReceiptController extends Controller
{
    public function __construct(private readonly ReceiptService $service) {}

    public function __invoke(UpdateReceiptRequest $request, Receipt $receipt): ReceiptResource|JsonResponse
    {
        try {
            $updated = $this->service->updateDraft($receipt->id, $request->receiptData());
        } catch (ReceiptAlreadyPostedException $e) {
            return response()->json([
                'status' => 409,
                'message' => $e->getMessage(),
                'errors' => [],
            ], 409);
        }

        return new ReceiptResource($updated);
    }
}
