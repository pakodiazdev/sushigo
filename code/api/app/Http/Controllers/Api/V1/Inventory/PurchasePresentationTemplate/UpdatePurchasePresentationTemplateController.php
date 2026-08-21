<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\PurchasePresentationTemplate;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\PurchasePresentationTemplate\UpdatePurchasePresentationTemplateRequest;
use App\Http\Resources\Inventory\PurchasePresentationTemplate\PurchasePresentationTemplateResource;
use App\Models\PurchasePresentationTemplate;

/**
 * @OA\Put(
 *   path="/api/v1/inventory/purchase-presentation-templates/{template}",
 *   summary="Update Purchase Presentation Template",
 *   description="package_type, base_unit_quantity and compatible_dimension_uom_id become immutable once the template has ever been assigned to a Variant.",
 *   tags={"Purchase Presentation Templates"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="template", in="path", required=true, @OA\Schema(type="string"), description="Template public_id (ULID)"),
 *
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/UpdatePurchasePresentationTemplateRequest")),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Template updated successfully",
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
 *   @OA\Response(response=403, description="Forbidden — requires purchase_presentation_templates.manage permission"),
 *   @OA\Response(response=404, description="Template not found"),
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class UpdatePurchasePresentationTemplateController extends Controller
{
    public function __invoke(UpdatePurchasePresentationTemplateRequest $request, PurchasePresentationTemplate $template): PurchasePresentationTemplateResource
    {
        $template->update($request->templateData());
        $template->load('compatibleUom');

        return new PurchasePresentationTemplateResource($template);
    }
}
