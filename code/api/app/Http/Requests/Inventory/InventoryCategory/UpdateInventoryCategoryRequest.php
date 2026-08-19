<?php

declare(strict_types=1);

namespace App\Http\Requests\Inventory\InventoryCategory;

use App\Models\InventoryCategory;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * @OA\Schema(
 *   schema="UpdateInventoryCategoryRequest",
 *
 *   @OA\Property(property="name", type="string", maxLength=255),
 *   @OA\Property(property="position", type="integer"),
 *   @OA\Property(property="is_active", type="boolean")
 * )
 */
class UpdateInventoryCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:255', Rule::unique('inventory_categories', 'name')->ignore($this->route('inventoryCategory'))->whereNull('deleted_at')],
            'position' => ['sometimes', 'integer', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * A category cannot be deactivated while active Products reference it —
     * see doc/architecture/product-catalog/product-catalog-architecture.en.md §3.3.
     *
     * Only fires on an actual active→inactive transition. Without the current-state check,
     * a no-op edit (e.g. renaming) that happens to resend `is_active: false` on a category
     * that is already inactive — but still has an active Product pointing at it via the
     * documented assignment asymmetry (see PR #467's Needs Human Judgment section) — would be
     * rejected outright even though nothing is being newly deactivated.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            if ($this->boolean('is_active') || ! $this->has('is_active')) {
                return;
            }

            /** @var InventoryCategory $category */
            $category = $this->route('inventoryCategory');

            if (! $category->is_active) {
                return;
            }

            $activeProductsCount = $category->activeProductsCount();

            if ($activeProductsCount > 0) {
                $noun = $activeProductsCount === 1 ? 'Product' : 'Products';
                $validator->errors()->add(
                    'is_active',
                    "Cannot deactivate this category: it still has {$activeProductsCount} active {$noun}. Deactivate or reassign them first."
                );
            }
        });
    }

    /**
     * @return array<string, mixed>
     */
    public function categoryData(): array
    {
        return $this->validated();
    }
}
