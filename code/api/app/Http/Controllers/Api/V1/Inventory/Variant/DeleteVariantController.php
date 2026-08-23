<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\Variant;

use App\Http\Controllers\Controller;
use App\Http\Responses\Common\ResponseMessage;
use App\Models\Item;
use App\Models\ItemVariant;

/**
 * @OA\Delete(
 *   path="/api/v1/inventory/products/{id}/variants/{variantId}",
 *   summary="Delete Product Variant",
 *   tags={"Product Variants"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
 *   @OA\Parameter(name="variantId", in="path", required=true, @OA\Schema(type="integer")),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Variant deleted successfully",
 *
 *       @OA\JsonContent(ref="#/components/schemas/ResponseMessage")
 *   ),
 *
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires items.delete permission"),
 *   @OA\Response(response=404, description="Product or Variant not found", @OA\JsonContent(ref="#/components/schemas/ResponseError")),
 *   @OA\Response(response=409, description="Cannot delete — Variant has stock on hand", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class DeleteVariantController extends Controller
{
    public function __invoke(string $id, string $variantId)
    {
        $product = Item::where('type', Item::TYPE_PRODUCTO)->where('public_id', $id)->firstOrFail();
        $variant = ItemVariant::where('item_id', $product->id)->where('public_id', $variantId)->firstOrFail();

        if ($variant->stock()->where('on_hand', '>', 0)->exists()) {
            return response()->json([
                'status' => 409,
                'message' => 'Cannot delete a variant that has stock on hand. Clear inventory first.',
                'errors' => [],
            ], 409);
        }

        $variant->stock()->delete();
        $variant->delete();

        return new ResponseMessage(
            message: 'Variant deleted successfully'
        );
    }
}
