<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\PurchasePresentationTemplate;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\PurchasePresentationTemplate\SuggestPurchasePresentationTemplateCodeRequest;
use App\Models\UnitOfMeasure;
use App\Support\PurchasePresentationTemplateCodeGenerator;
use Illuminate\Http\JsonResponse;

/**
 * @OA\Get(
 *   path="/api/v1/inventory/purchase-presentation-templates/suggest-code",
 *   operationId="suggestPurchasePresentationTemplateCode",
 *   summary="Suggest an available semantic Purchase Presentation Template code",
 *   description="Composition order: package type + normalized quantity, then compatible UOM code, then a numeric suffix. Quantities use the database scale (four decimals) and omit trailing zeroes. Soft-deleted codes remain occupied for suggestions. Every candidate is capped at 50 characters.",
 *   tags={"Purchase Presentation Templates"}, security={{"passport": {}}},
 *
 *   @OA\Parameter(name="package_type", in="query", required=true, @OA\Schema(type="string", enum={"UNIT","PACK","BOX","TRAY"})),
 *   @OA\Parameter(name="base_unit_quantity", in="query", required=true, @OA\Schema(type="number", minimum=0.0001, maximum=99999999999.9999, example=24)),
 *   @OA\Parameter(name="compatible_dimension_uom_id", in="query", required=true, @OA\Schema(type="string")),
 *
 *   @OA\Response(response=200, description="Available semantic code", @OA\JsonContent(@OA\Property(property="code", type="string", maxLength=50, example="BOX_24_KG"))),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires purchase_presentation_templates.manage permission"),
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class SuggestPurchasePresentationTemplateCodeController extends Controller
{
    public function __invoke(
        SuggestPurchasePresentationTemplateCodeRequest $request,
        PurchasePresentationTemplateCodeGenerator $generator,
    ): JsonResponse {
        $validated = $request->validated();
        $uom = UnitOfMeasure::where('public_id', $validated['compatible_dimension_uom_id'])->firstOrFail();

        return response()->json([
            'code' => $generator->suggest(
                $validated['package_type'],
                $validated['base_unit_quantity'],
                $uom,
            ),
        ]);
    }
}
