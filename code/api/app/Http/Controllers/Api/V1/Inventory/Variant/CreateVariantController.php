<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\Variant;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\Variant\CreateVariantRequest;
use App\Http\Resources\Inventory\Variant\VariantResource;
use App\Models\Item;
use App\Models\ItemVariant;
use App\Models\UnitOfMeasure;
use App\Support\VariantSkuCollisionResponder;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

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
 *   @OA\Response(
 *       response=422,
 *       description="Validation Error. A concurrent SKU collision also returns rejected_code and suggested_code.",
 *
 *       @OA\JsonContent(allOf={@OA\Schema(ref="#/components/schemas/ResponseError"), @OA\Schema(@OA\Property(property="rejected_code", type="string", example="ARR-KG"), @OA\Property(property="suggested_code", type="string", example="ARR-KG-002"))})
 *   )
 * )
 */
class CreateVariantController extends Controller
{
    public function __invoke(
        CreateVariantRequest $request,
        string $id,
        VariantSkuCollisionResponder $collisionResponder,
    ): VariantResource|JsonResponse {
        $product = Item::where('type', Item::TYPE_PRODUCTO)->where('public_id', $id)->firstOrFail();
        $data = $request->variantData($product->id);

        try {
            $variant = DB::transaction(fn () => ItemVariant::create($data));
        } catch (UniqueConstraintViolationException $exception) {
            if (! $collisionResponder->isCodeViolation($exception)) {
                throw $exception;
            }

            $uom = UnitOfMeasure::findOrFail($data['uom_id']);

            return $collisionResponder->response(
                CreateVariantRequest::DUPLICATE_CODE_MESSAGE,
                $data['code'],
                $product->name,
                $data['name'],
                $uom->code,
            );
        }

        $variant->load('unitOfMeasure');

        return (new VariantResource($variant))->setStatusCode(201);
    }
}
