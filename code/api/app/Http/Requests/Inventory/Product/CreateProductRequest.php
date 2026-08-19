<?php

declare(strict_types=1);

namespace App\Http\Requests\Inventory\Product;

use App\Http\Requests\Concerns\AuthorizesMediaGalleryOwnership;
use App\Http\Requests\Concerns\ReadsRawStringInput;
use App\Http\Requests\Concerns\ResolvesPublicIdReferences;
use App\Http\Requests\Inventory\Product\Concerns\SharesProductValidationMessages;
use App\Models\Brand;
use App\Models\InventoryCategory;
use App\Models\Item;
use App\Models\MediaGallery;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Catalog-identity-only Product write contract — never accepts sku, cost,
 * price, stock thresholds, or UOM. See
 * doc/architecture/product-catalog/product-catalog-architecture.en.md §6.
 *
 * @OA\Schema(
 *   schema="CreateProductRequest",
 *   required={"name", "inventory_category_id"},
 *
 *   @OA\Property(property="name", type="string", maxLength=255, example="Coca-Cola Original 600 ml"),
 *   @OA\Property(property="inventory_category_id", type="string", example="01JKXYZ1234567890ABCDEFGH", description="InventoryCategory public_id (ULID)"),
 *   @OA\Property(property="brand_id", type="string", nullable=true, example="01JKXYZ1234567890ABCDEFGH", description="Brand public_id (ULID) — must be an active brand"),
 *   @OA\Property(property="description", type="string", nullable=true),
 *   @OA\Property(property="is_active", type="boolean", example=true, description="Active status (default: true)"),
 *   @OA\Property(property="media_gallery_id", type="string", nullable=true, description="Gallery public_id (ULID) uploaded via POST /media/upload to attach as this product's images"),
 *   @OA\Property(property="owner_token", type="string", nullable=true, description="Only checked when media_gallery_id points at a gallery still unattached to anything"),
 * )
 */
class CreateProductRequest extends FormRequest
{
    use AuthorizesMediaGalleryOwnership, ReadsRawStringInput, ResolvesPublicIdReferences, SharesProductValidationMessages;

    public function authorize(): bool
    {
        if (! $this->user()->can('create', Item::class)) {
            return false;
        }

        return $this->authorizesMediaGalleryOwnership();
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'inventory_category_id' => [
                'required', 'string',
                Rule::exists('inventory_categories', 'public_id')->withoutTrashed(),
            ],
            'brand_id' => [
                'nullable', 'string',
                Rule::exists('brands', 'public_id')->where(fn ($query) => $query->where('is_active', true))->withoutTrashed(),
            ],
            'description' => ['nullable', 'string'],
            'is_active' => ['nullable', 'boolean'],
            'media_gallery_id' => ['nullable', 'string', 'exists:media_galleries,public_id'],
            'owner_token' => ['sometimes', 'string'],
        ];
    }

    public function messages(): array
    {
        return $this->productValidationMessages();
    }

    public function inventoryCategoryId(): int
    {
        return $this->resolvePublicId(InventoryCategory::class, 'inventory_category_id');
    }

    public function brandId(): ?int
    {
        return $this->resolvePublicId(Brand::class, 'brand_id');
    }

    public function mediaGalleryId(): ?int
    {
        return $this->resolvePublicId(MediaGallery::class, 'media_gallery_id');
    }

    /**
     * Validated fields ready for Item::create() — forces type=PRODUCTO,
     * resolves brand/category public_ids to numeric FKs, and excludes
     * media_gallery_id/owner_token (neither is fillable on Item).
     *
     * @return array<string, mixed>
     */
    public function productData(): array
    {
        $data = collect($this->validated())
            ->except(['inventory_category_id', 'brand_id', 'media_gallery_id', 'owner_token'])
            ->all();

        $data['type'] = Item::TYPE_PRODUCTO;
        $data['inventory_category_id'] = $this->inventoryCategoryId();
        $data['brand_id'] = $this->brandId();
        $data['is_active'] ??= true;

        return $data;
    }
}
