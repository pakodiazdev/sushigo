<?php

namespace App\Http\Controllers\Api\V1\Items;

use App\Http\Controllers\Api\V1\Items\Concerns\FormatsItemVariant;
use App\Http\Controllers\Controller;
use App\Http\Requests\Items\CreateItemVariantRequest;
use App\Http\Responses\Common\ResponseEntity;
use App\Models\Item;
use App\Models\ItemVariant;
use App\Models\UnitOfMeasure;
use App\Support\VariantSkuCollisionResponder;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

/**
 * @OA\Post(
 *   path="/api/v1/item-variants",
 *   summary="Create Item Variant",
 *   tags={"Item Variants"},
 *   security={{"passport": {}}},
 *
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/CreateItemVariantRequest")),
 *
 *   @OA\Response(
 *       response=201,
 *       description="Item variant created successfully",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *              @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *              @OA\Schema(@OA\Property(property="data", ref="#/components/schemas/ItemVariantResponse"))
 *           }
 *       )
 *   ),
 *
 *   @OA\Response(
 *       response=422,
 *       description="Validation Error. A concurrent SKU collision also returns rejected_code and suggested_code.",
 *
 *       @OA\JsonContent(allOf={@OA\Schema(ref="#/components/schemas/ResponseError"), @OA\Schema(@OA\Property(property="rejected_code", type="string", example="HAR-KG"), @OA\Property(property="suggested_code", type="string", example="HAR-KG-002"))})
 *   )
 * )
 */
class CreateItemVariantController extends Controller
{
    use FormatsItemVariant;

    public function __invoke(
        CreateItemVariantRequest $request,
        VariantSkuCollisionResponder $collisionResponder,
    ): ResponseEntity|JsonResponse {
        $data = $request->variantData();

        try {
            $variant = DB::transaction(fn () => ItemVariant::create($data));
        } catch (UniqueConstraintViolationException $exception) {
            if (! $collisionResponder->isCodeViolation($exception)) {
                throw $exception;
            }

            $item = Item::findOrFail($data['item_id']);
            $uom = UnitOfMeasure::findOrFail($data['uom_id']);

            return $collisionResponder->response(
                CreateItemVariantRequest::DUPLICATE_CODE_MESSAGE,
                $data['code'],
                $item->name,
                $data['name'],
                $uom->code,
            );
        }

        $variant->load(['item', 'unitOfMeasure']);

        return new ResponseEntity(
            data: [
                ...$this->baseVariantData($variant),
                ...$this->variantRelations($variant),
                'created_at' => $variant->created_at,
                'updated_at' => $variant->updated_at,
            ],
            status: 201
        );
    }
}
