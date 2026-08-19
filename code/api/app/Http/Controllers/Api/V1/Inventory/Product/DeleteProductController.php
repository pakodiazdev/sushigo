<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\Product;

use App\Http\Controllers\Controller;
use App\Http\Responses\Common\ResponseMessage;
use App\Models\Item;

/**
 * @OA\Delete(
 *   path="/api/v1/inventory/products/{id}",
 *   summary="Delete Product",
 *   tags={"Products"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Product deleted successfully",
 *
 *       @OA\JsonContent(ref="#/components/schemas/ResponseMessage")
 *   ),
 *
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires items.delete permission"),
 *   @OA\Response(response=404, description="Product not found", @OA\JsonContent(ref="#/components/schemas/ResponseError")),
 *   @OA\Response(response=409, description="Cannot delete - Product has variants", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class DeleteProductController extends Controller
{
    public function __invoke(int $id)
    {
        $product = Item::where('type', Item::TYPE_PRODUCTO)->findOrFail($id);

        if ($product->variants()->exists()) {
            return response()->json([
                'status' => 409,
                'message' => 'Cannot delete a product that has variants. Delete variants first.',
                'errors' => [],
            ], 409);
        }

        $product->delete();

        return new ResponseMessage(
            message: 'Product deleted successfully'
        );
    }
}
