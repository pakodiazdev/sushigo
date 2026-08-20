<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\Variant;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\Variant\CreateVariantRequest;
use App\Http\Resources\Inventory\Variant\VariantResource;
use App\Models\ItemVariant;

/**
 * @OA\Post(
 *   path="/api/v1/inventory/products/{id}/variants",
 *   summary="Create Product Variant",
 *   description="Catalog identity only — never accepts acquisition cost, sale price, or stock thresholds/balances. See doc/architecture/product-catalog/product-catalog-architecture.en.md.",
 *   tags={"Product Variants"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
 *
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/CreateVariantRequest")),
 *
 *   @OA\Response(
 *       response=201,
 *       description="Variant created successfully",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *              @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *              @OA\Schema(@OA\Property(property="data", ref="#/components/schemas/VariantResponse"))
 *           }
 *       )
 *   ),
 *
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires items.create permission"),
 *   @OA\Response(response=404, description="Product not found", @OA\JsonContent(ref="#/components/schemas/ResponseError")),
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class CreateVariantController extends Controller
{
    public function __invoke(CreateVariantRequest $request, int $id): VariantResource
    {
        $variant = ItemVariant::create($request->variantData($id));

        $variant->load('unitOfMeasure');

        return (new VariantResource($variant))->setStatusCode(201);
    }
}
