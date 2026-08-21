<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\PurchasePresentationTemplate;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\PurchasePresentationTemplate\StorePurchasePresentationTemplateRequest;
use App\Http\Resources\Inventory\PurchasePresentationTemplate\PurchasePresentationTemplateResource;
use App\Models\PurchasePresentationTemplate;

/**
 * @OA\Post(
 *   path="/api/v1/inventory/purchase-presentation-templates",
 *   summary="Create Purchase Presentation Template",
 *   description="Admin-managed, reusable across compatible Variants — no purchase price or supplier data. See doc/architecture/product-catalog/product-catalog-architecture.en.md.",
 *   tags={"Purchase Presentation Templates"},
 *   security={{"passport": {}}},
 *
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/StorePurchasePresentationTemplateRequest")),
 *
 *   @OA\Response(
 *       response=201,
 *       description="Template created successfully",
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
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class CreatePurchasePresentationTemplateController extends Controller
{
    public function __invoke(StorePurchasePresentationTemplateRequest $request): PurchasePresentationTemplateResource
    {
        $template = PurchasePresentationTemplate::create($request->templateData());
        $template->load('compatibleUom');

        return (new PurchasePresentationTemplateResource($template))->setStatusCode(201);
    }
}
