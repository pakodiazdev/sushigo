<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\Receipt;

use App\Exceptions\ReceiptAlreadyReversedException;
use App\Exceptions\ReceiptNotPostedException;
use App\Exceptions\ReceiptReversalBoundaryException;
use App\Exceptions\ReceiptVariantUnavailableException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\Receipt\ReverseReceiptRequest;
use App\Http\Resources\Inventory\Receipt\ReceiptResource;
use App\Models\Receipt;
use App\Services\Inventory\ReceiptService;
use Illuminate\Http\JsonResponse;

/**
 * @OA\Post(
 *   path="/api/v1/inventory/receipts/{receipt}/reverse",
 *   operationId="reverseReceipt",
 *   summary="Reverse a posted Purchase Receipt",
 *   tags={"Receipts"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="receipt", in="path", required=true, @OA\Schema(type="string"), description="Receipt public_id (ULID)"),
 *
 *   @OA\RequestBody(required=false, @OA\JsonContent(ref="#/components/schemas/ReverseReceiptRequest")),
 *
 *   @OA\Response(response=200, description="Receipt reversed successfully", @OA\JsonContent(allOf={@OA\Schema(ref="#/components/schemas/ResponseEntity"), @OA\Schema(@OA\Property(property="data", ref="#/components/schemas/ReceiptResponse"))})),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires receipts.manage permission"),
 *   @OA\Response(response=404, description="Receipt not found", @OA\JsonContent(ref="#/components/schemas/ResponseError")),
 *   @OA\Response(response=409, description="Receipt not posted, already reversed, the reversal boundary was hit, or a referenced Product Variant is no longer available", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class ReverseReceiptController extends Controller
{
    public function __construct(private readonly ReceiptService $service) {}

    public function __invoke(ReverseReceiptRequest $request, Receipt $receipt): ReceiptResource|JsonResponse
    {
        try {
            $reversed = $this->service->reverseReceipt($receipt->id, $request->user()->id, $request->input('reason'));
        } catch (ReceiptNotPostedException|ReceiptAlreadyReversedException|ReceiptReversalBoundaryException|ReceiptVariantUnavailableException $e) {
            return response()->json([
                'status' => 409,
                'message' => $e->getMessage(),
                'errors' => [],
            ], 409);
        }

        return new ReceiptResource($reversed);
    }
}
