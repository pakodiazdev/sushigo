<?php

declare(strict_types=1);

namespace App\Http\Requests\Inventory\SupplierOffering;

use App\Models\SupplierOffering;
use Illuminate\Contracts\Validation\Validator;

/**
 * @OA\Schema(
 *   schema="UpdateSupplierOfferingRequest",
 *
 *   @OA\Property(property="supplier_code", type="string", maxLength=100, nullable=true),
 *   @OA\Property(property="quoted_price", type="number", format="float", minimum=0, example=510),
 *   @OA\Property(property="currency", type="string", minLength=3, maxLength=3, example="MXN"),
 *   @OA\Property(property="valid_from", type="string", format="date", nullable=true),
 *   @OA\Property(property="valid_until", type="string", format="date", nullable=true),
 *   @OA\Property(property="minimum_order_quantity", type="number", format="float", minimum=0.0001),
 *   @OA\Property(property="lead_time_days", type="integer", minimum=0, nullable=true),
 *   @OA\Property(property="is_active", type="boolean")
 * )
 */
class UpdateSupplierOfferingRequest extends SupplierOfferingRequest
{
    public function rules(): array
    {
        $rules = $this->commercialRules();

        foreach (['quoted_price', 'currency', 'minimum_order_quantity', 'is_active'] as $field) {
            $rules[$field] = ['sometimes', ...$rules[$field]];
        }

        return $rules;
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($validator->errors()->count() > 0) {
                return;
            }

            /** @var SupplierOffering $offering */
            $offering = $this->route('offering');
            $from = $this->exists('valid_from') ? $this->date('valid_from') : $offering->valid_from;
            $until = $this->exists('valid_until') ? $this->date('valid_until') : $offering->valid_until;

            if ($from && $until && $until->lt($from)) {
                $validator->errors()->add('valid_until', 'La fecha de fin debe ser igual o posterior a la fecha de inicio.');
            }
        });
    }
}
