<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\PurchasePresentationTemplate;

use App\Http\Controllers\Controller;
use App\Models\PurchasePresentationTemplate;
use Illuminate\Http\Response;
use Illuminate\Validation\ValidationException;

/**
 * @OA\Delete(
 *   path="/api/v1/inventory/purchase-presentation-templates/{template}",
 *   summary="Delete Purchase Presentation Template",
 *   description="Templates ever assigned to a Variant (past or present) cannot be deleted at all — deactivate them instead (PUT is_active=false). A template with zero assignment history is soft-deleted (never hard-deleted/forceDelete()), consistent with the rest of the catalog's Deactivate, don't delete pattern.",
 *   tags={"Purchase Presentation Templates"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="template", in="path", required=true, @OA\Schema(type="string"), description="Template public_id (ULID)"),
 *
 *   @OA\Response(response=204, description="Template deleted"),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires purchase_presentation_templates.manage permission"),
 *   @OA\Response(response=404, description="Template not found"),
 *   @OA\Response(response=422, description="Template has assignment history — deactivate instead")
 * )
 */
class DeletePurchasePresentationTemplateController extends Controller
{
    /**
     * @throws ValidationException
     */
    public function __invoke(PurchasePresentationTemplate $template): Response
    {
        if ($template->hasAnyAssignments()) {
            throw ValidationException::withMessages([
                'template' => 'Cannot delete this template: it has been assigned to a Variant. Deactivate it instead.',
            ]);
        }

        $template->delete();

        return response()->noContent();
    }
}
