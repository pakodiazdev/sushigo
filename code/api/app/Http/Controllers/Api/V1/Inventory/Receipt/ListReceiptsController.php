<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\Receipt;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\Receipt\ListReceiptsRequest;
use App\Http\Resources\Inventory\Receipt\ReceiptSummaryResource;
use App\Http\Responses\Common\ResponsePaginated;
use App\Models\Receipt;
use App\Support\Access\OperatingUnitScope;

/**
 * @OA\Get(
 *   path="/api/v1/inventory/receipts",
 *   operationId="listReceipts",
 *   summary="List and filter Purchase Receipts (bounded summary history)",
 *   description="Server-side paginated, deterministically ordered (receipt_date DESC, id DESC) summary read model. Operating Unit scope is applied before filters, counting and pagination, so page metadata never reflects receipts outside the caller's accessible units. Full line evidence is available from GET /inventory/receipts/{id}.",
 *   tags={"Receipts"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="status", in="query", @OA\Schema(type="string", enum={"DRAFT", "POSTED", "REVERSED"})),
 *   @OA\Parameter(name="supplier_id", in="query", @OA\Schema(type="string"), description="Supplier public_id (ULID)"),
 *   @OA\Parameter(name="destination_location_id", in="query", @OA\Schema(type="string"), description="Receiving InventoryLocation public_id (ULID)"),
 *   @OA\Parameter(name="date_from", in="query", @OA\Schema(type="string", format="date"), description="Inclusive lower bound on receipt_date"),
 *   @OA\Parameter(name="date_to", in="query", @OA\Schema(type="string", format="date"), description="Inclusive upper bound on receipt_date"),
 *   @OA\Parameter(name="search", in="query", @OA\Schema(type="string"), description="Case-insensitive match on reference"),
 *   @OA\Parameter(name="per_page", in="query", @OA\Schema(type="integer", minimum=1, maximum=100, default=15)),
 *   @OA\Parameter(name="page", in="query", @OA\Schema(type="integer", minimum=1, default=1)),
 *
 *   @OA\Response(
 *     response=200,
 *     description="Receipts retrieved successfully",
 *
 *     @OA\JsonContent(
 *       allOf={
 *
 *         @OA\Schema(ref="#/components/schemas/ResponsePaginated"),
 *         @OA\Schema(@OA\Property(property="data", type="array", @OA\Items(ref="#/components/schemas/ReceiptSummaryResponse")))
 *       }
 *     )
 *   ),
 *
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires receipts.view permission")
 * )
 */
class ListReceiptsController extends Controller
{
    public function __invoke(ListReceiptsRequest $request, OperatingUnitScope $scope): ResponsePaginated
    {
        $query = Receipt::query()
            ->with(['supplier', 'destinationLocation'])
            ->withSum('lines', 'net_acquisition_amount');

        // Horizontal authorization (#440/#586): restrict to receipts received
        // into the caller's accessible Operating Units *before* any request
        // filter, count or page, so pagination metadata can never leak the
        // existence or count of receipts the caller may not see.
        $scope->constrainReceipts($query, $request->user());

        if ($request->filled('status')) {
            $query->status($request->string('status')->toString());
        }

        if ($request->filled('supplier_id')) {
            $query->where('supplier_id', $request->supplierId());
        }

        if ($request->filled('destination_location_id')) {
            $query->where('destination_location_id', $request->destinationLocationId());
        }

        if ($request->filled('date_from')) {
            $query->whereDate('receipt_date', '>=', $request->date('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->whereDate('receipt_date', '<=', $request->date('date_to'));
        }

        if ($request->filled('search')) {
            // Escape LIKE metacharacters so a search term containing % or _ (or the
            // \ escape char itself) matches literally instead of acting as a
            // wildcard. Postgres ILIKE uses \ as the default ESCAPE character.
            $term = addcslashes($request->string('search')->toString(), '\\%_');
            $query->where('reference', 'ILIKE', '%'.$term.'%');
        }

        // Deterministic newest-first ordering with a stable tie-breaker so a
        // row never shifts across page boundaries between requests.
        $query->orderByDesc('receipt_date')->orderByDesc('id');

        $receipts = $query->paginate($request->perPage());

        $receipts->getCollection()->transform(
            fn (Receipt $receipt) => (new ReceiptSummaryResource($receipt))->resolve()
        );

        return new ResponsePaginated(paginator: $receipts);
    }
}
