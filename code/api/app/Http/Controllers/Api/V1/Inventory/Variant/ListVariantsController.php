<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\Variant;

use App\Http\Controllers\Api\V1\Items\Concerns\FiltersItemListing;
use App\Http\Controllers\Controller;
use App\Http\Resources\Inventory\Variant\VariantResource;
use App\Http\Responses\Common\ResponsePaginated;
use App\Models\Item;
use Illuminate\Http\Request;

/**
 * @OA\Get(
 *   path="/api/v1/inventory/products/{id}/variants",
 *   summary="List Product Variants",
 *   description="Always Product-scoped — a non-Product Item id resolves as not found.",
 *   tags={"Product Variants"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="string"), description="Product public_id (ULID)"),
 *   @OA\Parameter(name="search", in="query", @OA\Schema(type="string", maxLength=255), description="Case-insensitive match on variant name or code"),
 *   @OA\Parameter(name="is_active", in="query", @OA\Schema(type="boolean"), description="Restrict to active or inactive variants"),
 *   @OA\Parameter(name="per_page", in="query", @OA\Schema(type="integer", default=15, minimum=1, maximum=100)),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Variants retrieved successfully",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *              @OA\Schema(ref="#/components/schemas/ResponsePaginated"),
 *              @OA\Schema(@OA\Property(property="data", type="array", @OA\Items(ref="#/components/schemas/VariantResponse")))
 *           }
 *       )
 *   ),
 *
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires items.view, suppliers.manage, or receipts.manage permission"),
 *   @OA\Response(response=404, description="Product not found", @OA\JsonContent(ref="#/components/schemas/ResponseError")),
 *   @OA\Response(response=422, description="Validation Error — invalid per_page, search or is_active", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class ListVariantsController extends Controller
{
    use FiltersItemListing;

    public function __invoke(Request $request, string $id): ResponsePaginated
    {
        $product = Item::where('type', Item::TYPE_PRODUCTO)->where('public_id', $id)->firstOrFail();

        $perPage = $request->validate([
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'search' => ['sometimes', 'nullable', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
        ])['per_page'] ?? 15;

        $query = $product->variants()->with('unitOfMeasure')->getQuery();

        $this->applyIsActiveFilter($query, $request);
        $this->applySearchFilter($query, $request, ['name', 'code']);

        $variants = $query->orderBy('code')->paginate($perPage);

        $variants->getCollection()->transform(
            fn ($variant) => (new VariantResource($variant))->resolve()
        );

        return new ResponsePaginated(paginator: $variants);
    }
}
