<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Pricing;

use App\Http\Controllers\Controller;
use App\Http\Requests\Pricing\ResolveVariantPriceRequest;
use App\Services\Pricing\PriceResolutionService;
use Illuminate\Http\JsonResponse;

/**
 * @OA\Get(
 *   path="/api/v1/pricing/resolve",
 *   summary="Resolve a Variant's authoritative sale price for a Branch/Operating Unit context",
 *   description="Price-list evidence is the sole source (the ItemVariant.sale_price fallback column was dropped in #442) — 'resolved: false' with a null price is a valid, explicit outcome, not an error.",
 *   tags={"Pricing Resolution"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="item_variant_id", in="query", required=true, @OA\Schema(type="string")),
 *   @OA\Parameter(name="branch_id", in="query", required=true, @OA\Schema(type="integer")),
 *   @OA\Parameter(name="operating_unit_id", in="query", @OA\Schema(type="integer"), description="More specific override within the branch"),
 *   @OA\Parameter(name="as_of", in="query", @OA\Schema(type="string", format="date"), description="Defaults to today"),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Resolution result (resolved may be false — that is not an error)",
 *
 *       @OA\JsonContent(
 *
 *           @OA\Property(property="status", type="integer", example=200),
 *           @OA\Property(property="data", type="object",
 *               @OA\Property(property="item_variant_id", type="string"),
 *               @OA\Property(property="branch_id", type="integer"),
 *               @OA\Property(property="operating_unit_id", type="integer", nullable=true),
 *               @OA\Property(property="as_of", type="string", format="date"),
 *               @OA\Property(property="resolved", type="boolean"),
 *               @OA\Property(property="price", type="string", nullable=true, example="129.5000"),
 *               @OA\Property(property="price_list", type="object", nullable=true,
 *                   @OA\Property(property="id", type="string"),
 *                   @OA\Property(property="code", type="string"),
 *                   @OA\Property(property="name", type="string")
 *               )
 *           )
 *       )
 *   ),
 *
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires price_lists.view permission"),
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class ResolveVariantPriceController extends Controller
{
    public function __invoke(ResolveVariantPriceRequest $request, PriceResolutionService $service): JsonResponse
    {
        $variant = $request->resolveItemVariant();
        $branchId = $request->branchId();
        $operatingUnitId = $request->operatingUnitId();
        $asOf = $request->asOf();

        $result = $service->resolve($variant, $branchId, $operatingUnitId, $asOf);

        return response()->json([
            'status' => 200,
            'data' => [
                'item_variant_id' => $variant->public_id,
                'branch_id' => $branchId,
                'operating_unit_id' => $operatingUnitId,
                'as_of' => $asOf->toDateString(),
                'resolved' => $result->resolved,
                'price' => $result->price,
                'price_list' => $result->priceList !== null ? [
                    'id' => $result->priceList->public_id,
                    'code' => $result->priceList->code,
                    'name' => $result->priceList->name,
                ] : null,
            ],
        ], 200);
    }
}
