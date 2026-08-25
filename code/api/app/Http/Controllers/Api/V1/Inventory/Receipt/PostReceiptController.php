<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\Receipt;

use App\Exceptions\ReceiptAlreadyPostedException;
use App\Exceptions\ReceiptAlreadyReversedException;
use App\Exceptions\ReceiptDestinationUnavailableException;
use App\Http\Controllers\Controller;
use App\Http\Resources\Inventory\Receipt\ReceiptResource;
use App\Models\Receipt;
use App\Services\Inventory\ReceiptService;
use Illuminate\Http\JsonResponse;

/**
 * @OA\Post(
 *   path="/api/v1/inventory/receipts/{receipt}/post",
 *   operationId="postReceipt",
 *   summary="Post a draft Purchase Receipt into Stock",
 *   tags={"Receipts"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="receipt", in="path", required=true, @OA\Schema(type="string"), description="Receipt public_id (ULID)"),
 *
 *   @OA\Response(response=200, description="Receipt posted successfully", @OA\JsonContent(allOf={@OA\Schema(ref="#/components/schemas/ResponseEntity"), @OA\Schema(@OA\Property(property="data", ref="#/components/schemas/ReceiptResponse"))})),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires receipts.manage permission"),
 *   @OA\Response(response=404, description="Receipt not found", @OA\JsonContent(ref="#/components/schemas/ResponseError")),
 *   @OA\Response(response=409, description="Receipt already posted or reversed, or its destination location is no longer available", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class PostReceiptController extends Controller
{
    public function __construct(private readonly ReceiptService $service) {}

    public function __invoke(Receipt $receipt): ReceiptResource|JsonResponse
    {
        try {
            $posted = $this->service->postReceipt($receipt->id, request()->user()->id);
        } catch (ReceiptAlreadyPostedException|ReceiptAlreadyReversedException|ReceiptDestinationUnavailableException $e) {
            return response()->json([
                'status' => 409,
                'message' => $e->getMessage(),
                'errors' => [],
            ], 409);
        }

        return new ReceiptResource($posted);
    }
}
