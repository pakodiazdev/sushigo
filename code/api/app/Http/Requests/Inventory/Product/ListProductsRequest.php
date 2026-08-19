<?php

declare(strict_types=1);

namespace App\Http\Requests\Inventory\Product;

use App\Http\Requests\Concerns\ResolvesPublicIdReferences;
use App\Models\Brand;
use App\Models\InventoryCategory;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * @OA\Schema(
 *   schema="ListProductsRequest",
 *
 *   @OA\Property(property="brand_id", type="string", description="Filter by Brand public_id (ULID)"),
 *   @OA\Property(property="inventory_category_id", type="string", description="Filter by InventoryCategory public_id (ULID)"),
 *   @OA\Property(property="is_active", type="boolean"),
 *   @OA\Property(property="search", type="string", description="Search in name"),
 *   @OA\Property(property="per_page", type="integer", example=15),
 * )
 */
class ListProductsRequest extends FormRequest
{
    use ResolvesPublicIdReferences;

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('is_active')) {
            $this->merge([
                'is_active' => filter_var($this->is_active, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE),
            ]);
        }
    }

    public function rules(): array
    {
        return [
            'brand_id' => ['nullable', 'string', Rule::exists('brands', 'public_id')->withoutTrashed()],
            'inventory_category_id' => ['nullable', 'string', Rule::exists('inventory_categories', 'public_id')->withoutTrashed()],
            'is_active' => ['nullable', 'boolean'],
            'search' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }

    /**
     * Resolves the brand_id filter's public_id (ULID) input to Brand's
     * numeric FK — see App\Http\Requests\Concerns\ResolvesPublicIdReferences.
     * Returns null when the filter wasn't supplied.
     */
    public function brandId(): ?int
    {
        return $this->resolvePublicId(Brand::class, 'brand_id');
    }

    /**
     * Resolves the inventory_category_id filter's public_id (ULID) input to
     * InventoryCategory's numeric FK. Returns null when the filter wasn't
     * supplied.
     */
    public function inventoryCategoryId(): ?int
    {
        return $this->resolvePublicId(InventoryCategory::class, 'inventory_category_id');
    }
}
