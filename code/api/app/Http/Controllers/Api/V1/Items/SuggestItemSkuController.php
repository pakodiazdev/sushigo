<?php

namespace App\Http\Controllers\Api\V1\Items;

use App\Http\Controllers\Controller;
use App\Http\Requests\Items\SuggestItemSkuRequest;
use App\Support\ItemSkuGenerator;
use Illuminate\Http\JsonResponse;

/**
 * @OA\Get(
 *   path="/api/v1/items/next-sku",
 *   operationId="suggestItemSku",
 *   summary="Suggest a contextual SKU for a new Item",
 *   description="Returns an editable SKU whose prefix is derived from the Item name (`Salmón fresco` → `SAL-001`) and whose numeric suffix is the next unused one for that prefix, including soft-deleted Items. The suggestion is advisory only — the database unique constraint on `items.sku` remains authoritative. See the `SuggestItemSkuRequest` schema and `config/items.php` for the deterministic normalization rules.",
 *   tags={"Items"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="name", in="query", required=false, @OA\Schema(type="string", maxLength=255), example="Salmón fresco"),
 *   @OA\Parameter(name="type", in="query", required=false, @OA\Schema(type="string", enum={"INSUMO", "ACTIVO"}), example="INSUMO"),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Suggested SKU",
 *
 *       @OA\JsonContent(
 *
 *           @OA\Property(property="sku", type="string", example="SAL-001"),
 *           @OA\Property(property="prefix", type="string", example="SAL-")
 *       )
 *   ),
 *
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires items.create permission"),
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class SuggestItemSkuController extends Controller
{
    public function __invoke(SuggestItemSkuRequest $request): JsonResponse
    {
        $generator = new ItemSkuGenerator($request->contextName());

        return response()->json([
            'sku' => $generator->next(),
            'prefix' => $generator->prefix(),
        ]);
    }
}
