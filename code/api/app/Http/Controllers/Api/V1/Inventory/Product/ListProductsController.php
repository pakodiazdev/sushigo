<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\Product;

use App\Http\Controllers\Api\V1\Items\Concerns\FiltersItemListing;
use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\Product\ListProductsRequest;
use App\Http\Resources\Inventory\Product\ProductResource;
use App\Http\Responses\Common\ResponsePaginated;
use App\Models\Item;
use Illuminate\Database\Eloquent\Builder;

/**
 * @OA\Get(
 *   path="/api/v1/inventory/products",
 *   summary="List Products",
 *   description="Always scoped to Item.type=PRODUCTO.",
 *   tags={"Products"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="brand_id", in="query", @OA\Schema(type="string")),
 *   @OA\Parameter(name="inventory_category_id", in="query", @OA\Schema(type="string")),
 *   @OA\Parameter(name="is_active", in="query", @OA\Schema(type="boolean"), description="Filters on effective activity: a Product whose inventory_category is inactive is excluded from is_active=1 and included under is_active=0, regardless of the Product's own is_active flag — see its warnings note."),
 *   @OA\Parameter(name="search", in="query", @OA\Schema(type="string")),
 *   @OA\Parameter(name="per_page", in="query", @OA\Schema(type="integer", default=15)),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Products retrieved successfully",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *              @OA\Schema(ref="#/components/schemas/ResponsePaginated"),
 *              @OA\Schema(@OA\Property(property="data", type="array", @OA\Items(ref="#/components/schemas/ProductResponse")))
 *           }
 *       )
 *   ),
 *
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires items.view permission")
 * )
 */
class ListProductsController extends Controller
{
    use FiltersItemListing;

    public function __invoke(ListProductsRequest $request): ResponsePaginated
    {
        $query = Item::query()
            ->where('type', Item::TYPE_PRODUCTO)
            ->with(['brand', 'inventoryCategory', 'mediaAttachments.mediaGallery.mediaAssets'])
            ->withCount('variants');

        if ($brandId = $request->brandId()) {
            $query->where('brand_id', $brandId);
        }

        if ($inventoryCategoryId = $request->inventoryCategoryId()) {
            $query->where('inventory_category_id', $inventoryCategoryId);
        }

        $this->applyProductIsActiveFilter($query, $request);
        $this->applySearchFilter($query, $request, ['name']);

        $products = $query->orderBy('name')->paginate($this->resolvePerPage($request));

        $products->getCollection()->transform(
            fn (Item $item) => (new ProductResource($item))->resolve()
        );

        return new ResponsePaginated(paginator: $products);
    }

    /**
     * A Product with an inactive InventoryCategory is allowed to exist (see
     * PR #467's Needs Human Judgment) but must not surface as "active" —
     * `?is_active=1` excludes it even if the Product's own is_active is
     * true, and `?is_active=0` includes it even if the Product's own
     * is_active is true, since it isn't effectively active either way. The
     * same treatment extends to a Product with **no** category at all (only
     * reachable via the still-open legacy `/items` write path — see PR
     * #467's review thread on this) and to one whose category has since
     * been **soft-deleted**: `Item::inventoryCategory()` uses `withTrashed()`
     * so a plain `whereHas('inventoryCategory', is_active=true)` would still
     * match a deleted-but-still-`is_active`-flagged category, so the
     * `withoutTrashed()` re-scope below is required, not redundant.
     * Deliberately not reused from FiltersItemListing::applyIsActiveFilter()
     * — that trait is shared with the generic /items listing, which has no
     * category-active concept.
     */
    private function applyProductIsActiveFilter(Builder $query, ListProductsRequest $request): void
    {
        if (! $request->filled('is_active')) {
            return;
        }

        $hasEffectivelyActiveCategory = fn (Builder $cat) => $cat->where('is_active', true)->withoutTrashed();

        if ($request->boolean('is_active')) {
            $query->where('is_active', true)
                ->whereHas('inventoryCategory', $hasEffectivelyActiveCategory);
        } else {
            $query->where(function (Builder $q) use ($hasEffectivelyActiveCategory) {
                $q->where('is_active', false)
                    ->orWhereDoesntHave('inventoryCategory', $hasEffectivelyActiveCategory);
            });
        }
    }
}
