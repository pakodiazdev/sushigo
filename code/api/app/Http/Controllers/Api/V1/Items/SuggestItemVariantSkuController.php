<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Items;

use App\Http\Controllers\Controller;
use App\Http\Requests\Items\SuggestItemVariantSkuRequest;
use App\Support\VariantSkuGenerator;
use Illuminate\Http\JsonResponse;

/**
 * @OA\Get(
 *   path="/api/v1/item-variants/suggest-code",
 *   summary="Suggest a contextual SKU for a legacy INSUMO/ACTIVO Variant",
 *   description="Uses the same global, historically occupied ItemVariant SKU contract as the Product-scoped endpoint. The legacy route excludes PRODUCTO parents.",
 *   tags={"Item Variants"}, security={{"passport": {}}},
 *
 *   @OA\Parameter(name="item_id", in="query", required=true, @OA\Schema(type="string")),
 *   @OA\Parameter(name="name", in="query", required=true, @OA\Schema(type="string", maxLength=255)),
 *   @OA\Parameter(name="uom_id", in="query", required=true, @OA\Schema(type="string")),
 *
 *   @OA\Response(response=200, description="Suggested SKU", @OA\JsonContent(@OA\Property(property="code", type="string", example="HAR-KG"), @OA\Property(property="prefix", type="string", example="HAR-"))),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires items.create permission"),
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class SuggestItemVariantSkuController extends Controller
{
    public function __invoke(
        SuggestItemVariantSkuRequest $request,
        VariantSkuGenerator $generator,
    ): JsonResponse {
        $item = $request->item();
        $uom = $request->unitOfMeasure();

        return response()->json([
            'code' => $generator->suggest($item->name, $request->variantName(), $uom->code),
            'prefix' => VariantSkuGenerator::derivePrefix($item->name),
        ]);
    }
}
