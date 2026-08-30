<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\Variant;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\Variant\SuggestVariantSkuRequest;
use App\Models\Item;
use App\Support\VariantSkuGenerator;
use Illuminate\Http\JsonResponse;

/**
 * @OA\Get(
 *   path="/api/v1/inventory/products/{id}/variants/suggest-code",
 *   summary="Suggest a contextual SKU for a new Product Variant",
 *   description="Combines a normalized three-character Product prefix with normalized Variant/UOM context. The first candidate has no numeric suffix; global or soft-deleted collisions advance to -002, -003, and so on. Suggestions are advisory and never rename existing Variants.",
 *   tags={"Product Variants"}, security={{"passport": {}}},
 *
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="string")),
 *   @OA\Parameter(name="name", in="query", required=true, @OA\Schema(type="string", maxLength=255), example="500 g"),
 *   @OA\Parameter(name="uom_id", in="query", required=true, @OA\Schema(type="string")),
 *
 *   @OA\Response(response=200, description="Suggested SKU", @OA\JsonContent(@OA\Property(property="code", type="string", example="ARR-500G"), @OA\Property(property="prefix", type="string", example="ARR-"))),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires items.create permission"),
 *   @OA\Response(response=404, description="Product not found"),
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class SuggestVariantSkuController extends Controller
{
    public function __invoke(
        SuggestVariantSkuRequest $request,
        string $id,
        VariantSkuGenerator $generator,
    ): JsonResponse {
        $product = Item::where('type', Item::TYPE_PRODUCTO)->where('public_id', $id)->firstOrFail();
        $uom = $request->unitOfMeasure();

        return response()->json([
            'code' => $generator->suggest($product->name, $request->variantName(), $uom->code),
            'prefix' => VariantSkuGenerator::derivePrefix($product->name),
        ]);
    }
}
