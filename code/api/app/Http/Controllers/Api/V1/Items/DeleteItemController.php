<?php

namespace App\Http\Controllers\Api\V1\Items;

use App\Http\Controllers\Controller;
use App\Http\Responses\Common\ResponseMessage;
use App\Models\Item;

/**
 * @OA\Delete(
 *   path="/api/v1/items/{id}",
 *   summary="Delete Item",
 *   tags={"Items"},
 *   security={{"passport": {}}},
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
 *   @OA\Response(
 *       response=200,
 *       description="Item deleted successfully",
 *       @OA\JsonContent(ref="#/components/schemas/ResponseMessage")
 *   ),
 *   @OA\Response(response=404, description="Item not found", @OA\JsonContent(ref="#/components/schemas/ResponseError")),
 *   @OA\Response(response=409, description="Cannot delete - Item has variants", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class DeleteItemController extends Controller
{
    public function __invoke(int $id)
    {
        $item = Item::findOrFail($id);

        // Check if item has variants
        if ($item->variants()->exists()) {
            return response()->json([
                'status' => 409,
                'message' => 'Cannot delete item that has variants. Delete variants first.',
                'errors' => [],
            ], 409);
        }

        $item->delete();

        return new ResponseMessage(
            message: 'Item deleted successfully'
        );
    }
}
