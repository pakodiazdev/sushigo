<?php

declare(strict_types=1);

namespace App\Http\Requests\Inventory\SupplierOffering;

use App\Http\Requests\Inventory\SupplierOffering\Concerns\SharesSupplierOfferingValidationMessages;
use Illuminate\Foundation\Http\FormRequest;

/**
 * @OA\Schema(
 *   schema="ListSupplierOfferingsRequest",
 *
 *   @OA\Property(property="is_active", type="boolean"),
 *   @OA\Property(property="currency", type="string", minLength=3, maxLength=3, example="MXN"),
 *   @OA\Property(property="variant_purchase_presentation_id", type="string", description="Purchase Presentation public_id (ULID)"),
 *   @OA\Property(property="valid_on", type="string", format="date")
 * )
 */
class ListSupplierOfferingsRequest extends FormRequest
{
    use SharesSupplierOfferingValidationMessages;

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('is_active')) {
            $this->merge([
                'is_active' => filter_var($this->input('is_active'), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE),
            ]);
        }

        if ($this->has('currency')) {
            $currency = trim((string) $this->input('currency'));
            $this->merge(['currency' => $currency === '' ? null : strtoupper($currency)]);
        }
    }

    public function rules(): array
    {
        return [
            'is_active' => ['nullable', 'boolean'],
            'currency' => ['nullable', 'string', 'size:3', 'regex:/^[A-Z]{3}$/'],
            'variant_purchase_presentation_id' => ['nullable', 'string'],
            'valid_on' => ['nullable', 'date'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            ...$this->supplierOfferingMessages([
                'currency.string',
                'currency.size',
                'currency.regex',
                'variant_purchase_presentation_id.string',
            ]),
            'is_active.boolean' => 'El filtro de estado debe ser verdadero o falso.',
            'valid_on.date' => 'La fecha de vigencia no es válida.',
        ];
    }
}
