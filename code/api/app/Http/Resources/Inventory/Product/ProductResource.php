<?php

declare(strict_types=1);

namespace App\Http\Resources\Inventory\Product;

use App\Http\Resources\BaseResource;
use App\Models\Item;

/**
 * Item scoped to type=PRODUCTO — see
 * doc/architecture/product-catalog/product-catalog-architecture.en.md §6.
 * Uses Item's numeric id (not public_id) — see this PR's Assumptions note:
 * #399 (public_id rollout for the Inventory domain) hasn't landed yet.
 *
 * @mixin Item
 *
 * @OA\Schema(
 *     schema="ProductResponse",
 *     title="Product Response",
 *
 *     @OA\Property(property="id", type="integer", example=42),
 *     @OA\Property(property="name", type="string", example="Coca-Cola Original 600 ml"),
 *     @OA\Property(property="description", type="string", nullable=true),
 *     @OA\Property(property="is_active", type="boolean"),
 *     @OA\Property(property="brand", type="object", nullable=true,
 *         @OA\Property(property="id", type="string", example="01JKXYZ1234567890ABCDEFGH"),
 *         @OA\Property(property="name", type="string", example="Coca-Cola")
 *     ),
 *     @OA\Property(property="inventory_category", type="object",
 *         @OA\Property(property="id", type="string", example="01JKXYZ1234567890ABCDEFGH"),
 *         @OA\Property(property="name", type="string", example="Beverages")
 *     ),
 *     @OA\Property(property="photo_url", type="string", nullable=true),
 *     @OA\Property(property="variants_count", type="integer", example=3),
 *     @OA\Property(
 *         property="warnings", type="array", @OA\Items(type="string"),
 *         description="Backend-authored, human-readable notes about this Product's current state — e.g. an assigned but inactive category. Empty when there's nothing to flag."
 *     ),
 *     @OA\Property(property="created_at", type="string", format="date-time")
 * )
 */
class ProductResource extends BaseResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'is_active' => $this->is_active,
            'brand' => $this->whenLoaded('brand', fn () => $this->brand ? [
                'id' => $this->brand->public_id,
                'name' => $this->brand->name,
            ] : null),
            'inventory_category' => $this->whenLoaded('inventoryCategory', fn () => $this->inventoryCategory ? [
                'id' => $this->inventoryCategory->public_id,
                'name' => $this->inventoryCategory->name,
            ] : null),
            'photo_url' => $this->mediaAttachments->firstWhere('is_primary', true)
                ?->mediaGallery?->mediaAssets->firstWhere('is_primary', true)
                ?->url,
            'variants_count' => $this->whenCounted('variants'),
            'warnings' => $this->warnings(),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }

    /**
     * Assigning a Product to an inactive InventoryCategory is allowed (see
     * PR #467's Needs Human Judgment) but the Product must not read as
     * fully active while that's true — ListProductsController's is_active
     * filter excludes it from the "active" bucket, and this warning is the
     * standard structured-feedback mechanism telling the caller why. The
     * same treatment covers a Product with no category at all (only
     * reachable via the still-open legacy /items write path) and one whose
     * category has since been soft-deleted — Item::inventoryCategory() uses
     * withTrashed(), so a deleted category still loads and would otherwise
     * render silently with no explanation for why the Product isn't active.
     *
     * @return array<int, string>
     */
    private function warnings(): array
    {
        $message = $this->categoryWarningMessage();

        return $message ? [$message] : [];
    }

    private function categoryWarningMessage(): ?string
    {
        if (! $this->relationLoaded('inventoryCategory')) {
            return null;
        }

        $category = $this->inventoryCategory;

        return match (true) {
            ! $category => 'This product has no inventory category assigned; it will not appear as active until one is assigned.',
            $category->trashed() => "The assigned category \"{$category->name}\" has been deleted; this product will not appear as active until it is reassigned to an active category.",
            ! $category->is_active => "The assigned category \"{$category->name}\" is inactive; this product will not appear as active until it is reactivated.",
            default => null,
        };
    }
}
