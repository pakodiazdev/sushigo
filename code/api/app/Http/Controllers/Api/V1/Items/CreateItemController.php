<?php

namespace App\Http\Controllers\Api\V1\Items;

use App\Http\Controllers\Controller;
use App\Http\Requests\Items\CreateItemRequest;
use App\Http\Responses\Common\ResponseEntity;
use App\Models\Item;
use App\Services\Media\MediaAttachmentService;
use App\Support\ItemSkuGenerator;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

/**
 * @OA\Post(
 *   path="/api/v1/items",
 *   summary="Create Item",
 *   tags={"Items"},
 *   security={{"passport": {}}},
 *
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/CreateItemRequest")),
 *
 *   @OA\Response(
 *       response=201,
 *       description="Item created successfully",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *              @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *              @OA\Schema(@OA\Property(property="data", ref="#/components/schemas/ItemResponse"))
 *           }
 *       )
 *   ),
 *
 *   @OA\Response(
 *       response=422,
 *       description="Validation Error. On a create-time unique-SKU race the body also carries `rejected_sku` (the SKU that was taken) and `suggested_sku` (a freshly calculated replacement for the same contextual prefix) alongside the standard `errors.sku` field error.",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *               @OA\Schema(ref="#/components/schemas/ResponseError"),
 *               @OA\Schema(
 *
 *                   @OA\Property(property="rejected_sku", type="string", nullable=true, example="SAL-001"),
 *                   @OA\Property(property="suggested_sku", type="string", nullable=true, example="SAL-002")
 *               )
 *           }
 *       )
 *   )
 * )
 */
class CreateItemController extends Controller
{
    public function __invoke(CreateItemRequest $request, MediaAttachmentService $mediaAttachmentService): ResponseEntity|JsonResponse
    {
        try {
            // Wrapped so a lost unique-SKU race rolls back cleanly (savepoint under an outer
            // transaction) and the connection stays usable for the fresh suggestion below.
            $item = DB::transaction(function () use ($request, $mediaAttachmentService) {
                $item = Item::create($request->itemData());

                if ($mediaGalleryId = $request->mediaGalleryId()) {
                    $mediaAttachmentService($item, $mediaGalleryId);
                }

                return $item;
            });
        } catch (UniqueConstraintViolationException) {
            // The `unique:items,sku` rule in CreateItemRequest is a TOCTOU race: a concurrent
            // request can pass it before either insert commits. The unique index on items.sku
            // is the actual guarantee — surface it as a stable field-error contract that also
            // hands the client a fresh suggestion for the same contextual prefix.
            $suggestion = new ItemSkuGenerator($request->input('name'));

            return response()->json([
                'message' => CreateItemRequest::DUPLICATE_SKU_MESSAGE,
                'errors' => ['sku' => [CreateItemRequest::DUPLICATE_SKU_MESSAGE]],
                'rejected_sku' => $request->itemData()['sku'],
                'suggested_sku' => $suggestion->next(),
            ], 422);
        }

        return new ResponseEntity(
            data: [
                'id' => $item->id,
                'sku' => $item->sku,
                'name' => $item->name,
                'description' => $item->description,
                'type' => $item->type,
                'is_stocked' => $item->is_stocked,
                'is_perishable' => $item->is_perishable,
                'is_active' => $item->is_active,
                'created_at' => $item->created_at,
                'updated_at' => $item->updated_at,
            ],
            status: 201
        );
    }
}
