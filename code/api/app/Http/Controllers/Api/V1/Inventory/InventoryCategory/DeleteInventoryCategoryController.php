<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory\InventoryCategory;

use App\Http\Controllers\Controller;
use App\Models\InventoryCategory;
use Illuminate\Http\Response;
use Illuminate\Validation\ValidationException;

/**
 * @OA\Delete(
 *   path="/api/v1/inventory-categories/{inventoryCategory}",
 *   summary="Delete Inventory Category",
 *   description="Soft-deletes the category. Existing Products keep their historical assignment.",
 *   tags={"Inventory Categories"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="inventoryCategory", in="path", required=true, @OA\Schema(type="string"), description="Inventory category public_id (ULID)"),
 *
 *   @OA\Response(response=204, description="Inventory category deleted"),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires inventory_categories.delete permission"),
 *   @OA\Response(response=404, description="Inventory category not found"),
 *   @OA\Response(response=422, description="Category still has active Products")
 * )
 */
class DeleteInventoryCategoryController extends Controller
{
    /**
     * Same guard as the deactivate endpoint — see
     * doc/architecture/product-catalog/product-catalog-architecture.en.md §3.3.
     * Deleting is soft-delete/trashing, which has the same practical effect
     * as deactivation (the category stops resolving for new assignments), so
     * it must not be able to bypass the rule that update() enforces. This is
     * a deliberate design decision (see PR #467's Needs Human Judgment): the
     * block stays even for a category that is itself already inactive — the
     * error message names exactly how many active Products still block it,
     * the standard structured-feedback pattern this backend uses so a
     * frontend can render the reason without re-deriving it.
     *
     * @throws ValidationException
     */
    public function __invoke(InventoryCategory $inventoryCategory): Response
    {
        $activeProductsCount = $inventoryCategory->activeProductsCount();

        if ($activeProductsCount > 0) {
            $noun = $activeProductsCount === 1 ? 'Product' : 'Products';

            throw ValidationException::withMessages([
                'inventory_category' => "Cannot delete this category: it still has {$activeProductsCount} active {$noun}. Deactivate or reassign them first.",
            ]);
        }

        $inventoryCategory->delete();

        return response()->noContent();
    }
}
