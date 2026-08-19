<?php

declare(strict_types=1);

namespace App\Http\Requests\Inventory\Product;

use App\Http\Requests\Concerns\AuthorizesMediaGalleryOwnership;
use App\Http\Requests\Concerns\ReadsRawStringInput;
use App\Models\Brand;
use App\Models\InventoryCategory;
use App\Models\Item;
use App\Models\MediaGallery;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

/**
 * @OA\Schema(
 *   schema="UpdateProductRequest",
 *
 *   @OA\Property(property="name", type="string", maxLength=255),
 *   @OA\Property(property="inventory_category_id", type="string", description="InventoryCategory public_id (ULID)"),
 *   @OA\Property(property="brand_id", type="string", nullable=true, description="Brand public_id (ULID) — must be an active brand"),
 *   @OA\Property(property="description", type="string", nullable=true),
 *   @OA\Property(property="is_active", type="boolean"),
 *   @OA\Property(property="media_gallery_id", type="string", nullable=true),
 *   @OA\Property(property="owner_token", type="string", nullable=true),
 * )
 */
class UpdateProductRequest extends FormRequest
{
    use AuthorizesMediaGalleryOwnership, ReadsRawStringInput;

    public function authorize(): bool
    {
        $product = Item::where('type', Item::TYPE_PRODUCTO)->findOrFail($this->route('id'));

        if (! $this->user()->can('update', $product)) {
            return false;
        }

        return $this->authorizesMediaGalleryOwnership();
    }

    /**
     * brand_id/inventory_category_id existence, soft-delete, and active
     * checks all run in withValidator() below instead of here — a plain
     * `exists`/`->withoutTrashed()` rule can't distinguish "genuinely
     * reassigning to a bad/inactive/deleted row" from "resending the
     * Product's own already-assigned value unchanged", and the latter must
     * always be allowed (see withValidator()'s docblock).
     */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'inventory_category_id' => ['sometimes', 'string'],
            'brand_id' => ['sometimes', 'nullable', 'string'],
            'description' => ['sometimes', 'nullable', 'string'],
            'is_active' => ['sometimes', 'boolean'],
            'media_gallery_id' => ['sometimes', 'nullable', 'string', 'exists:media_galleries,public_id'],
            'owner_token' => ['sometimes', 'string'],
        ];
    }

    /**
     * A PUT that resends the Product's already-assigned brand_id/
     * inventory_category_id unchanged (a common "send the full form back"
     * client pattern) must not become permanently un-editable just because
     * that brand/category was deactivated, or even soft-deleted, after the
     * assignment was made — only a genuine *new* assignment to an inactive
     * or deleted row is rejected. See doc/architecture/product-catalog/
     * product-catalog-architecture.en.md §3.3 ("blocks new assignments").
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $product = Item::where('type', Item::TYPE_PRODUCTO)->find($this->route('id'));

            $this->validateCategoryAssignment($validator, $product);
            $this->validateBrandAssignment($validator, $product);
        });
    }

    private function validateCategoryAssignment(Validator $validator, ?Item $product): void
    {
        if ($this->skipAssignmentCheck($validator, 'inventory_category_id')) {
            return;
        }

        $category = InventoryCategory::withTrashed()->where('public_id', $this->input('inventory_category_id'))->first();
        $isNoOpReassignment = $product && $category && $category->id === $product->inventory_category_id;

        if (! $category || (! $isNoOpReassignment && $category->trashed())) {
            $validator->errors()->add('inventory_category_id', 'The selected inventory category id is invalid.');
        }
    }

    private function validateBrandAssignment(Validator $validator, ?Item $product): void
    {
        if (! $this->has('brand_id') || $this->input('brand_id') === null) {
            return;
        }

        if ($this->skipAssignmentCheck($validator, 'brand_id')) {
            return;
        }

        $brand = Brand::withTrashed()->where('public_id', $this->input('brand_id'))->first();
        $isNoOpReassignment = $product && $brand && $brand->id === $product->brand_id;

        if (! $brand || (! $isNoOpReassignment && ($brand->trashed() || ! $brand->is_active))) {
            $validator->errors()->add('brand_id', 'The selected brand does not exist or is not active.');
        }
    }

    /**
     * Shared pre-check for both assignment validators: skip when the field
     * wasn't sent, when the `string` rule in rules() already produced a 422
     * for it, or when its raw input isn't actually a string — none of those
     * should reach a DB query built from a non-scalar value.
     */
    private function skipAssignmentCheck(Validator $validator, string $field): bool
    {
        if (! $this->has($field) || $validator->errors()->has($field)) {
            return true;
        }

        return ! is_string($this->input($field));
    }

    public function mediaGalleryId(): ?int
    {
        $publicId = $this->rawStringInput('media_gallery_id');

        return $publicId ? MediaGallery::where('public_id', $publicId)->value('id') : null;
    }

    /**
     * Validated fields ready for Item::update() — resolves brand/category
     * public_ids to numeric FKs (including a since-soft-deleted row, so a
     * no-op resend never nulls out an existing assignment), excludes
     * media_gallery_id/owner_token.
     *
     * @return array<string, mixed>
     */
    public function productData(): array
    {
        $data = collect($this->validated())
            ->except(['inventory_category_id', 'brand_id', 'media_gallery_id', 'owner_token'])
            ->all();

        if ($this->has('inventory_category_id')) {
            $data['inventory_category_id'] = InventoryCategory::withTrashed()
                ->where('public_id', $this->input('inventory_category_id'))
                ->value('id');
        }

        if ($this->has('brand_id')) {
            $data['brand_id'] = $this->input('brand_id')
                ? Brand::withTrashed()->where('public_id', $this->input('brand_id'))->value('id')
                : null;
        }

        return $data;
    }
}
