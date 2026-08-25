<?php

declare(strict_types=1);

namespace App\Http\Requests\Pricing\VariantPrices;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Carbon;

/**
 * item_variant_id is intentionally not editable — a price entry that needs
 * to price a different Variant is a new entry, not an edit of an existing
 * one (its overlap validation is keyed on item_variant_id + price_list_id).
 *
 * @OA\Schema(
 *   schema="UpdateVariantPriceRequest",
 *
 *   @OA\Property(property="price", type="string", example="129.5000"),
 *   @OA\Property(property="effective_from", type="string", format="date", example="2026-01-01"),
 *   @OA\Property(property="effective_to", type="string", format="date", nullable=true, example="2026-12-31"),
 *   @OA\Property(property="is_active", type="boolean", example=true),
 * )
 */
class UpdateVariantPriceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('priceList'));
    }

    public function rules(): array
    {
        return [
            // Same decimal(15,4) overflow/precision gap as StoreVariantPriceRequest — see its rules().
            'price' => ['sometimes', 'numeric', 'min:0', 'max:99999999999.9999', 'decimal:0,4'],
            'effective_from' => ['sometimes', 'date'],
            'effective_to' => ['nullable', 'date', 'after_or_equal:effective_from'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * `effective_to`'s `after_or_equal:effective_from` rule only compares
     * against effective_from *in this request's payload* — a request that
     * sends only effective_from, later than the row's already-stored
     * effective_to, passes that rule untouched and would otherwise reach
     * the service with an invalid resulting range, tripping the
     * chk_vp_effective_range DB constraint as an uncaught 500 instead of a
     * normal 422. This cross-checks the range the write will actually
     * produce, falling back to the stored value for whichever bound is
     * absent from the request — mirroring how VariantPriceService itself
     * computes the post-write effective_from/effective_to.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            if ($validator->errors()->hasAny(['effective_from', 'effective_to'])) {
                return;
            }

            $priceList = $this->route('priceList');
            $variantPrice = $priceList?->variantPrices()->where('public_id', $this->route('variantPrice'))->first();

            if (! $variantPrice) {
                return;
            }

            $effectiveFrom = $this->input('effective_from') ?? $variantPrice->effective_from->toDateString();
            $effectiveTo = $this->has('effective_to') ? $this->input('effective_to') : $variantPrice->effective_to?->toDateString();

            // Comparing raw strings only works for ISO 'Y-m-d' input — the
            // 'date' rule above accepts any format PHP's parser understands
            // (e.g. '08/01/2026'), which doesn't sort lexically the same way
            // it compares chronologically. Parse both before comparing.
            if ($effectiveTo !== null && Carbon::parse($effectiveTo)->lt(Carbon::parse($effectiveFrom))) {
                $validator->errors()->add('effective_to', 'effective_to debe ser posterior o igual a effective_from.');
            }
        });
    }

    /**
     * @return array<string, mixed>
     */
    public function variantPriceData(): array
    {
        return $this->validated();
    }
}
