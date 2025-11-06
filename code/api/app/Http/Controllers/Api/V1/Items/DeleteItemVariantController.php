<?php

namespace App\Http\Controllers\Api\V1\Items;

use App\Http\Controllers\Controller;
use App\Http\Responses\Common\ResponseMessage;
use App\Models\ItemVariant;

/**
 * @OA\Delete(
 *   path="/api/v1/item-variants/{id}",
 *   summary="Delete Item Variant",
 *   tags={"Item Variants"},
 *   security={{"passport": {}}},
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
 *   @OA\Response(
 *       response=200,
 *       description="Item variant deleted successfully",
 *       @OA\JsonContent(ref="#/components/schemas/ResponseMessage")
 *   ),
 *   @OA\Response(response=404, description="Item variant not found", @OA\JsonContent(ref="#/components/schemas/ResponseError")),
 *   @OA\Response(response=409, description="Cannot delete - Variant has stock", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class DeleteItemVariantController extends Controller
{
    public function __invoke(int $id)
    {
        $variant = ItemVariant::findOrFail($id);

        // Check if variant has stock
        if ($variant->stock()->where('on_hand', '>', 0)->exists()) {
            return response()->json([
                'status' => 409,
                'message' => 'Cannot delete variant that has stock on hand. Clear inventory first.',
                'errors' => [],
            ], 409);
        }

        // Delete stock records (with 0 on_hand)
        $variant->stock()->delete();
        
        // Delete the variant
        $variant->delete();

        return new ResponseMessage(
            message: 'Item variant deleted successfully'
        );
    }
}
