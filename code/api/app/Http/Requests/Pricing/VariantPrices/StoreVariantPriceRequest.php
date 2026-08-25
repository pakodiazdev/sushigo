<?php

declare(strict_types=1);

namespace App\Http\Requests\Pricing\VariantPrices;

use App\Http\Requests\Concerns\ResolvesPublicIdReferences;
use App\Models\ItemVariant;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * @OA\Schema(
 *   schema="StoreVariantPriceRequest",
 *   required={"item_variant_id", "price", "effective_from"},
 *
 *   @OA\Property(property="item_variant_id", type="string", example="01K4M6QY8E2B7N9Z3T5V1W0XCD", description="Product Variant public ID"),
 *   @OA\Property(property="price", type="string", example="129.5000", description="Exact decimal price"),
 *   @OA\Property(property="effective_from", type="string", format="date", example="2026-01-01"),
 *   @OA\Property(property="effective_to", type="string", format="date", nullable=true, example="2026-12-31"),
 *   @OA\Property(property="is_active", type="boolean", example=true, description="Active status (default: true)"),
 * )
 */
class StoreVariantPriceRequest extends FormRequest
{
    use ResolvesPublicIdReferences;

    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('priceList'));
    }

    public function rules(): array
    {
        return [
            // Table-based exists: rules ignore SoftDeletes, but resolvePublicId()
            // below resolves through the ItemVariant Eloquent model, which excludes
            // soft-deleted rows by default — without this scope, a soft-deleted
            // public_id would pass validation, resolve to a null id, and crash
            // the service with a TypeError instead of a normal 422.
            'item_variant_id' => ['required', 'string', Rule::exists('item_variants', 'public_id')->where(fn ($query) => $query->whereNull('deleted_at'))],
            // decimal(15,4): 11 integer digits, up to 4 fractional — 'numeric'
            // alone lets a larger value through validation, past which
            // Postgres rejects the insert with a numeric overflow (500)
            // instead of a normal 422; a value with more than 4 fractional
            // digits would otherwise be silently rounded by the column.
            'price' => ['required', 'numeric', 'min:0', 'max:99999999999.9999', 'decimal:0,4'],
            'effective_from' => ['required', 'date'],
            'effective_to' => ['nullable', 'date', 'after_or_equal:effective_from'],
            'is_active' => ['nullable', 'boolean'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function variantPriceData(): array
    {
        $data = $this->validated();
        $data['item_variant_id'] = $this->resolvePublicId(ItemVariant::class, 'item_variant_id');
        $data['is_active'] ??= true;

        return $data;
    }
}
