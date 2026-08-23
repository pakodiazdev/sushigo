<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\Product;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\Product\UpdateProductRequest;
use App\Http\Resources\Inventory\Product\ProductResource;
use App\Models\Item;
use App\Services\Media\MediaAttachmentService;
use Illuminate\Support\Facades\DB;

/**
 * @OA\Put(
 *   path="/api/v1/inventory/products/{id}",
 *   summary="Update Product",
 *   description="Catalog identity only — never accepts sku, cost, price, stock, or UOM. type is never changeable.",
 *   tags={"Products"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
 *
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/UpdateProductRequest")),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Product updated successfully",
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
 *   @OA\Response(response=403, description="Forbidden — requires items.update permission"),
 *   @OA\Response(response=404, description="Product not found", @OA\JsonContent(ref="#/components/schemas/ResponseError")),
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class UpdateProductController extends Controller
{
    public function __invoke(UpdateProductRequest $request, string $id, MediaAttachmentService $mediaAttachmentService): ProductResource
    {
        $product = Item::where('type', Item::TYPE_PRODUCTO)->where('public_id', $id)->firstOrFail();

        DB::transaction(function () use ($request, $product, $mediaAttachmentService) {
            $product->update($request->productData());

            if ($mediaGalleryId = $request->mediaGalleryId()) {
                $mediaAttachmentService($product, $mediaGalleryId);
            }
        });

        $product->load(['brand', 'inventoryCategory', 'mediaAttachments.mediaGallery.mediaAssets']);
        $product->loadCount('variants');

        return new ProductResource($product);
    }
}
