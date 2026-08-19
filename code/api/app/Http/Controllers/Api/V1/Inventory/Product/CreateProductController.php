<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\Product;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\Product\CreateProductRequest;
use App\Http\Resources\Inventory\Product\ProductResource;
use App\Models\Item;
use App\Services\Media\MediaAttachmentService;
use Illuminate\Support\Facades\DB;

/**
 * @OA\Post(
 *   path="/api/v1/inventory/products",
 *   summary="Create Product",
 *   description="Catalog identity only — never accepts sku, cost, price, stock, or UOM. See doc/architecture/product-catalog/product-catalog-architecture.en.md.",
 *   tags={"Products"},
 *   security={{"passport": {}}},
 *
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/CreateProductRequest")),
 *
 *   @OA\Response(
 *       response=201,
 *       description="Product created successfully",
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
 *   @OA\Response(response=403, description="Forbidden — requires items.create permission"),
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class CreateProductController extends Controller
{
    public function __invoke(CreateProductRequest $request, MediaAttachmentService $mediaAttachmentService): ProductResource
    {
        $product = DB::transaction(function () use ($request, $mediaAttachmentService) {
            $product = Item::create($request->productData());

            if ($mediaGalleryId = $request->mediaGalleryId()) {
                $mediaAttachmentService($product, $mediaGalleryId);
            }

            return $product;
        });

        $product->load(['brand', 'inventoryCategory', 'mediaAttachments.mediaGallery.mediaAssets']);
        $product->loadCount('variants');

        return (new ProductResource($product))->setStatusCode(201);
    }
}
