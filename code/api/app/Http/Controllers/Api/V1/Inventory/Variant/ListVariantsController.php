<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\Variant;

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
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
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
 *   @OA\Response(response=403, description="Forbidden — requires items.view permission"),
 *   @OA\Response(response=404, description="Product not found", @OA\JsonContent(ref="#/components/schemas/ResponseError")),
 *   @OA\Response(response=422, description="Validation Error — invalid per_page", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class ListVariantsController extends Controller
{
    public function __invoke(Request $request, int $id): ResponsePaginated
    {
        $product = Item::where('type', Item::TYPE_PRODUCTO)->findOrFail($id);

        $perPage = $request->validate([
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ])['per_page'] ?? 15;

        $variants = $product->variants()
            ->with('unitOfMeasure')
            ->orderBy('code')
            ->paginate($perPage);

        $variants->getCollection()->transform(
            fn ($variant) => (new VariantResource($variant))->resolve()
        );

        return new ResponsePaginated(paginator: $variants);
    }
}
