<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\StockTransfer;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\StockTransfer\ListStockTransfersRequest;
use App\Http\Resources\Inventory\StockTransfer\StockTransferSummaryResource;
use App\Http\Responses\Common\ResponsePaginated;
use App\Models\StockTransfer;
use App\Support\Access\OperatingUnitScope;

/**
 * @OA\Get(
 *   path="/api/v1/inventory/transfers",
 *   operationId="listStockTransfers",
 *   summary="List and filter internal Stock Transfers (bounded summary history)",
 *   description="Server-side paginated, deterministically ordered (transfer_date DESC, id DESC) summary read model. Operating Unit scope is applied before filters, counting and pagination. Full line evidence is available from GET /inventory/transfers/{transfer}.",
 *   tags={"Stock Transfers"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="status", in="query", @OA\Schema(type="string", enum={"DRAFT", "POSTED", "REVERSED"})),
 *   @OA\Parameter(name="source_location_id", in="query", @OA\Schema(type="string"), description="Source InventoryLocation public_id (ULID)"),
 *   @OA\Parameter(name="destination_location_id", in="query", @OA\Schema(type="string"), description="Destination InventoryLocation public_id (ULID)"),
 *   @OA\Parameter(name="date_from", in="query", @OA\Schema(type="string", format="date")),
 *   @OA\Parameter(name="date_to", in="query", @OA\Schema(type="string", format="date")),
 *   @OA\Parameter(name="search", in="query", @OA\Schema(type="string")),
 *   @OA\Parameter(name="per_page", in="query", @OA\Schema(type="integer", minimum=1, maximum=100, default=15)),
 *   @OA\Parameter(name="page", in="query", @OA\Schema(type="integer", minimum=1, default=1)),
 *
 *   @OA\Response(response=200, description="Stock Transfers retrieved successfully", @OA\JsonContent(allOf={@OA\Schema(ref="#/components/schemas/ResponsePaginated"), @OA\Schema(@OA\Property(property="data", type="array", @OA\Items(ref="#/components/schemas/StockTransferSummaryResponse")))})),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires stock.view permission")
 * )
 */
class ListStockTransfersController extends Controller
{
    public function __invoke(ListStockTransfersRequest $request, OperatingUnitScope $scope): ResponsePaginated
    {
        $query = StockTransfer::query()
            ->with(['sourceLocation', 'destinationLocation'])
            ->withCount('lines');

        // Horizontal authorization (#573/#440): restrict to Transfers touching
        // the caller's accessible Operating Units *before* any filter, count or
        // page, so pagination metadata never leaks foreign rows.
        $scope->constrainStockTransfers($query, $request->user());

        if ($request->filled('status')) {
            $query->status($request->string('status')->toString());
        }

        if ($request->filled('source_location_id')) {
            $query->where('source_location_id', $request->sourceLocationId());
        }

        if ($request->filled('destination_location_id')) {
            $query->where('destination_location_id', $request->destinationLocationId());
        }

        if ($request->filled('date_from')) {
            $query->whereDate('transfer_date', '>=', $request->date('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->whereDate('transfer_date', '<=', $request->date('date_to'));
        }

        if ($request->filled('search')) {
            $term = addcslashes($request->string('search')->toString(), '\\%_');
            $query->where('reference', 'ILIKE', '%'.$term.'%');
        }

        $query->orderByDesc('transfer_date')->orderByDesc('id');

        $transfers = $query->paginate($request->perPage());

        $transfers->getCollection()->transform(
            fn (StockTransfer $transfer) => (new StockTransferSummaryResource($transfer))->resolve()
        );

        return new ResponsePaginated(paginator: $transfers);
    }
}
