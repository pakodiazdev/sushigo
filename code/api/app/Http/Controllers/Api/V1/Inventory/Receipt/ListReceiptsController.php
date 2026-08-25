<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\Receipt;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\Receipt\ListReceiptsRequest;
use App\Http\Resources\Inventory\Receipt\ReceiptResource;
use App\Models\Receipt;
use App\Models\Supplier;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * @OA\Get(
 *   path="/api/v1/inventory/receipts",
 *   operationId="listReceipts",
 *   summary="List and filter Purchase Receipts",
 *   tags={"Receipts"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="status", in="query", @OA\Schema(type="string", enum={"DRAFT", "POSTED", "REVERSED"})),
 *   @OA\Parameter(name="supplier_id", in="query", @OA\Schema(type="string")),
 *
 *   @OA\Response(response=200, description="Receipts retrieved successfully", @OA\JsonContent(allOf={@OA\Schema(ref="#/components/schemas/ResponseEntity"), @OA\Schema(@OA\Property(property="data", type="array", @OA\Items(ref="#/components/schemas/ReceiptResponse")))})),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires receipts.view permission")
 * )
 */
class ListReceiptsController extends Controller
{
    public function __invoke(ListReceiptsRequest $request): AnonymousResourceCollection
    {
        $query = Receipt::query()
            ->with(['supplier', 'destinationLocation', 'lines.presentation.itemVariant'])
            ->orderByDesc('receipt_date')
            ->orderByDesc('id');

        if ($request->filled('status')) {
            $query->status($request->string('status')->toString());
        }

        if ($request->filled('supplier_id')) {
            $supplierId = Supplier::where('public_id', $request->input('supplier_id'))->value('id');
            $query->where('supplier_id', $supplierId);
        }

        return ReceiptResource::collection($query->get());
    }
}
