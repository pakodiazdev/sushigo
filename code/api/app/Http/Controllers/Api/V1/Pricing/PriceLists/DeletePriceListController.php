<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Pricing\PriceLists;

use App\Http\Controllers\Controller;
use App\Http\Responses\Common\ResponseMessage;
use App\Models\PriceList;
use Illuminate\Support\Facades\Gate;

/**
 * @OA\Delete(
 *   path="/api/v1/pricing/price-lists/{priceList}",
 *   summary="Delete Price List",
 *   tags={"Price Lists"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="priceList", in="path", required=true, @OA\Schema(type="string")),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Price List deleted successfully",
 *
 *       @OA\JsonContent(ref="#/components/schemas/ResponseMessage")
 *   ),
 *
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires price_lists.delete permission"),
 *   @OA\Response(response=404, description="Price List not found", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class DeletePriceListController extends Controller
{
    public function __invoke(PriceList $priceList): ResponseMessage
    {
        Gate::authorize('delete', $priceList);

        $priceList->delete();

        return new ResponseMessage(message: 'Price list deleted successfully');
    }
}
