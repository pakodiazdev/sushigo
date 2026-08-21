<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\PurchasePresentationTemplate;

use App\Http\Controllers\Controller;
use App\Http\Resources\Inventory\PurchasePresentationTemplate\PurchasePresentationTemplateResource;
use App\Models\PurchasePresentationTemplate;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * @OA\Get(
 *   path="/api/v1/inventory/purchase-presentation-templates",
 *   summary="List Purchase Presentation Templates",
 *   description="Global, reusable templates — not Product/Variant-scoped.",
 *   tags={"Purchase Presentation Templates"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="is_active", in="query", @OA\Schema(type="boolean")),
 *   @OA\Parameter(name="package_type", in="query", @OA\Schema(type="string", enum={"UNIT", "PACK", "BOX", "TRAY"})),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Templates retrieved successfully",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *              @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *              @OA\Schema(@OA\Property(property="data", type="array", @OA\Items(ref="#/components/schemas/PurchasePresentationTemplateResponse")))
 *           }
 *       )
 *   ),
 *
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires purchase_presentation_templates.view permission")
 * )
 */
class ListPurchasePresentationTemplatesController extends Controller
{
    public function __invoke(Request $request): AnonymousResourceCollection
    {
        $query = PurchasePresentationTemplate::query()->with('compatibleUom')->orderBy('name');

        if ($request->filled('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->filled('package_type')) {
            $query->where('package_type', $request->string('package_type'));
        }

        return PurchasePresentationTemplateResource::collection($query->get());
    }
}
