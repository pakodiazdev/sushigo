<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\Receipt;

use App\Exceptions\ReceiptAlreadyPostedException;
use App\Http\Controllers\Api\V1\Inventory\Receipt\Concerns\AssertsReceiptOperatingUnitAccess;
use App\Http\Controllers\Controller;
use App\Models\Receipt;
use App\Services\Inventory\ReceiptService;
use App\Support\Access\OperatingUnitScope;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

/**
 * @OA\Delete(
 *   path="/api/v1/inventory/receipts/{receipt}",
 *   operationId="deleteReceipt",
 *   summary="Soft-delete a draft Purchase Receipt",
 *   tags={"Receipts"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="receipt", in="path", required=true, @OA\Schema(type="string"), description="Receipt public_id (ULID)"),
 *
 *   @OA\Response(response=204, description="Receipt deleted"),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires receipts.manage permission"),
 *   @OA\Response(response=404, description="Receipt not found", @OA\JsonContent(ref="#/components/schemas/ResponseError")),
 *   @OA\Response(response=409, description="Cannot delete — Receipt is not a draft", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class DeleteReceiptController extends Controller
{
    use AssertsReceiptOperatingUnitAccess;

    public function __construct(private readonly ReceiptService $service) {}

    public function __invoke(Receipt $receipt, OperatingUnitScope $scope): Response|JsonResponse
    {
        $this->assertReceiptInScope($scope, $receipt);

        try {
            $this->service->deleteDraft($receipt->id, request()->user()->id);
        } catch (ReceiptAlreadyPostedException) {
            return response()->json([
                'status' => 409,
                'message' => 'Cannot delete a Receipt that is not a draft.',
                'errors' => [],
            ], 409);
        }

        return response()->noContent();
    }
}
