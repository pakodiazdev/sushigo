<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Pricing\VariantPrices;

use App\Http\Controllers\Controller;
use App\Http\Responses\Common\ResponseMessage;
use App\Models\PriceList;
use Illuminate\Support\Facades\Gate;

/**
 * @OA\Delete(
 *   path="/api/v1/pricing/price-lists/{priceList}/variant-prices/{variantPrice}",
 *   summary="Delete Variant Price",
 *   tags={"Variant Prices"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="priceList", in="path", required=true, @OA\Schema(type="string")),
 *   @OA\Parameter(name="variantPrice", in="path", required=true, @OA\Schema(type="string")),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Variant Price deleted successfully",
 *
 *       @OA\JsonContent(ref="#/components/schemas/ResponseMessage")
 *   ),
 *
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires price_lists.update permission"),
 *   @OA\Response(response=404, description="Price List or Variant Price not found", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class DeleteVariantPriceController extends Controller
{
    public function __invoke(PriceList $priceList, string $variantPrice)
    {
        Gate::authorize('update', $priceList);

        $model = $priceList->variantPrices()->where('public_id', $variantPrice)->firstOrFail();
        $model->delete();

        return new ResponseMessage(message: 'Variant price deleted successfully');
    }
}
