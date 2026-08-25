<?php

declare(strict_types=1);

namespace App\Http\Requests\Inventory\SupplierOffering;

use App\Http\Requests\Inventory\SupplierOffering\Concerns\SharesSupplierOfferingValidationMessages;
use Illuminate\Foundation\Http\FormRequest;

abstract class SupplierOfferingRequest extends FormRequest
{
    use SharesSupplierOfferingValidationMessages;

    /** Matches the supplier_offerings.quoted_price / minimum_order_quantity decimal(15,4) columns. */
    private const MAX_DECIMAL_15_4 = '99999999999.9999';

    /** Matches the supplier_offerings.lead_time_days unsignedInteger column (Postgres int4). */
    private const MAX_UNSIGNED_INT = 2147483647;

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('currency')) {
            $currency = trim((string) $this->input('currency'));
            $this->merge(['currency' => $currency === '' ? null : strtoupper($currency)]);
        }

        if ($this->has('supplier_code')) {
            $code = trim((string) $this->input('supplier_code'));
            $this->merge(['supplier_code' => $code === '' ? null : $code]);
        }
    }

    /** @return array<string, array<int, string>> */
    protected function commercialRules(): array
    {
        return [
            'supplier_code' => ['nullable', 'string', 'max:100'],
            'quoted_price' => ['numeric', 'min:0', 'max:'.self::MAX_DECIMAL_15_4],
            'currency' => ['string', 'size:3', 'regex:/^[A-Z]{3}$/'],
            'valid_from' => ['nullable', 'date'],
            'valid_until' => ['nullable', 'date'],
            'minimum_order_quantity' => ['numeric', 'gt:0', 'max:'.self::MAX_DECIMAL_15_4],
            'lead_time_days' => ['nullable', 'integer', 'min:0', 'max:'.self::MAX_UNSIGNED_INT],
            'is_active' => ['boolean'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return $this->supplierOfferingMessages([
            'supplier_code.string',
            'supplier_code.max',
            'quoted_price.numeric',
            'quoted_price.min',
            'quoted_price.max',
            'currency.string',
            'currency.size',
            'currency.regex',
            'valid_from.date',
            'valid_until.date',
            'minimum_order_quantity.numeric',
            'minimum_order_quantity.gt',
            'minimum_order_quantity.max',
            'lead_time_days.integer',
            'lead_time_days.min',
            'lead_time_days.max',
            'is_active.boolean',
        ]);
    }

    /** @return array<string, mixed> */
    public function offeringData(): array
    {
        return $this->validated();
    }
}
