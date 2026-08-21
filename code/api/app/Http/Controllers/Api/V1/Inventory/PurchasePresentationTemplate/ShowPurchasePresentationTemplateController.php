<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\PurchasePresentationTemplate;

use App\Http\Controllers\Controller;
use App\Http\Resources\Inventory\PurchasePresentationTemplate\PurchasePresentationTemplateResource;
use App\Models\PurchasePresentationTemplate;

/**
 * @OA\Get(
 *   path="/api/v1/inventory/purchase-presentation-templates/{template}",
 *   summary="Get Purchase Presentation Template by ID",
 *   tags={"Purchase Presentation Templates"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="template", in="path", required=true, @OA\Schema(type="string"), description="Template public_id (ULID)"),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Template retrieved successfully",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *              @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *              @OA\Schema(@OA\Property(property="data", ref="#/components/schemas/PurchasePresentationTemplateResponse"))
 *           }
 *       )
 *   ),
 *
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires purchase_presentation_templates.view permission"),
 *   @OA\Response(response=404, description="Template not found")
 * )
 */
class ShowPurchasePresentationTemplateController extends Controller
{
    public function __invoke(PurchasePresentationTemplate $template): PurchasePresentationTemplateResource
    {
        $template->load('compatibleUom');

        return new PurchasePresentationTemplateResource($template);
    }
}
