<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\Product;

use App\Http\Controllers\Controller;
use App\Http\Resources\Inventory\Product\ProductResource;
use App\Models\Item;

/**
 * @OA\Get(
 *   path="/api/v1/inventory/products/{id}",
 *   summary="Get Product by ID",
 *   description="Always scoped to Item.type=PRODUCTO — a non-Product Item id resolves as not found.",
 *   tags={"Products"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Product retrieved successfully",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *              @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *              @OA\Schema(@OA\Property(property="data", ref="#/components/schemas/ProductResponse"))
 *           }
 *       )
 *   ),
 *
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires items.view permission"),
 *   @OA\Response(response=404, description="Product not found", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class ShowProductController extends Controller
{
    public function __invoke(int $id): ProductResource
    {
        $product = Item::query()
            ->where('type', Item::TYPE_PRODUCTO)
            ->with(['brand', 'inventoryCategory', 'mediaAttachments.mediaGallery.mediaAssets'])
            ->withCount('variants')
            ->findOrFail($id);

        return new ProductResource($product);
    }
}
