<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\StockMovement;

use App\Http\Controllers\Api\V1\Inventory\StockMovement\Concerns\MasksInaccessibleMovementLocations;
use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\StockMovement\ListStockMovementsRequest;
use App\Http\Resources\Inventory\StockMovement\StockMovementSummaryResource;
use App\Http\Responses\Common\ResponsePaginated;
use App\Models\StockMovement;
use App\Support\Access\OperatingUnitScope;

/**
 * @OA\Get(
 *   path="/api/v1/inventory/movements",
 *   operationId="listStockMovements",
 *   summary="List and filter the immutable Inventory Stock Movement ledger",
 *   description="Server-side paginated, deterministically ordered (posted_at DESC NULLS LAST, id DESC) read model over the immutable Stock Movement history. Operating Unit scope is applied before filters, counting and pagination, so page metadata never reflects movements whose touched Locations are all outside the caller's accessible units. A read has no Stock or ledger write side effect. Full evidence for one row is available from GET /inventory/movements/{movement}.",
 *   tags={"Stock Movements"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="location_id", in="query", @OA\Schema(type="string"), description="InventoryLocation public_id (ULID) — matches source OR destination"),
 *   @OA\Parameter(name="item_variant_id", in="query", @OA\Schema(type="string"), description="ItemVariant public_id (ULID)"),
 *   @OA\Parameter(name="reason", in="query", @OA\Schema(type="string", enum={"TRANSFER","RETURN","SALE","ADJUSTMENT","CONSUMPTION","OPENING_BALANCE","COUNT_VARIANCE","PURCHASE_RECEIPT","PURCHASE_RECEIPT_REVERSAL"})),
 *   @OA\Parameter(name="status", in="query", @OA\Schema(type="string", enum={"DRAFT","POSTED","REVERSED"})),
 *   @OA\Parameter(name="date_from", in="query", @OA\Schema(type="string", format="date"), description="Inclusive lower bound on posted_at"),
 *   @OA\Parameter(name="date_to", in="query", @OA\Schema(type="string", format="date"), description="Inclusive upper bound on posted_at"),
 *   @OA\Parameter(name="search", in="query", @OA\Schema(type="string"), description="Case-insensitive match on reference"),
 *   @OA\Parameter(name="source_type", in="query", @OA\Schema(type="string", enum={"receipt"}), description="Originating source document type"),
 *   @OA\Parameter(name="per_page", in="query", @OA\Schema(type="integer", minimum=1, maximum=100, default=15)),
 *   @OA\Parameter(name="page", in="query", @OA\Schema(type="integer", minimum=1, default=1)),
 *
 *   @OA\Response(
 *     response=200,
 *     description="Stock movements retrieved successfully",
 *
 *     @OA\JsonContent(
 *       allOf={
 *
 *         @OA\Schema(ref="#/components/schemas/ResponsePaginated"),
 *         @OA\Schema(@OA\Property(property="data", type="array", @OA\Items(ref="#/components/schemas/StockMovementSummaryResponse")))
 *       }
 *     )
 *   ),
 *
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires stock.view permission")
 * )
 */
class ListStockMovementsController extends Controller
{
    use MasksInaccessibleMovementLocations;

    public function __invoke(ListStockMovementsRequest $request, OperatingUnitScope $scope): ResponsePaginated
    {
        $query = StockMovement::query()->with([
            'fromLocation' => fn ($relation) => $relation->withTrashed(),
            'toLocation' => fn ($relation) => $relation->withTrashed(),
            'itemVariant' => fn ($relation) => $relation->withTrashed()->with('unitOfMeasure'),
            'user',
            'related',
        ]);

        // Horizontal authorization (#440/#574): restrict to movements touching
        // the caller's accessible Operating Units *before* any request filter,
        // count or page, so pagination metadata can never leak the existence or
        // count of movements the caller may not see.
        $scope->constrainStockMovements($query, $request->user());

        if ($request->filled('location_id')) {
            $locationId = $request->locationId();
            $query->where(fn ($scoped) => $scoped
                ->where('from_location_id', $locationId)
                ->orWhere('to_location_id', $locationId));
        }

        if ($request->filled('item_variant_id')) {
            $query->where('item_variant_id', $request->itemVariantId());
        }

        if ($request->filled('reason')) {
            $query->where('reason', $request->string('reason')->toString());
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        if ($request->filled('date_from')) {
            $query->whereDate('posted_at', '>=', $request->date('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->whereDate('posted_at', '<=', $request->date('date_to'));
        }

        if ($request->filled('search')) {
            // Escape LIKE metacharacters so a term containing % or _ (or the \
            // escape char itself) matches literally. Postgres ILIKE uses \ as
            // the default ESCAPE character.
            $term = addcslashes($request->string('search')->toString(), '\\%_');
            $query->where('reference', 'ILIKE', '%'.$term.'%');
        }

        if ($request->filled('source_type')) {
            $query->where('related_type', $request->sourceTypeClass());
        }

        // Deterministic newest-first ordering with a stable tie-breaker so a row
        // never shifts across page boundaries between requests. Not-yet-posted
        // DRAFT rows (null posted_at) sort last rather than floating to the top.
        $query->orderByRaw('posted_at DESC NULLS LAST')->orderByDesc('id');

        $movements = $query->paginate($request->perPage());

        // A cross-unit transfer is visible because one end is in scope — null out
        // the other end so it never leaks a foreign unit's Location (#574).
        $this->maskInaccessibleLocations($movements->getCollection(), $scope, $request->user());

        $movements->getCollection()->transform(
            fn (StockMovement $movement) => (new StockMovementSummaryResource($movement))->resolve()
        );

        return new ResponsePaginated(paginator: $movements);
    }
}
