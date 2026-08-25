<?php

declare(strict_types=1);

namespace App\Http\Requests\Inventory\SupplierOffering;

use App\Models\Supplier;
use App\Models\SupplierOffering;
use App\Models\VariantPurchasePresentation;
use Illuminate\Contracts\Validation\Validator;

/**
 * Reference quotation input. This does not post an acquisition cost.
 *
 * @OA\Schema(
 *   schema="StoreSupplierOfferingRequest",
 *   required={"variant_purchase_presentation_id", "quoted_price"},
 *
 *   @OA\Property(property="variant_purchase_presentation_id", type="string", example="01JKXYZ1234567890ABCDEFGH", description="Purchase Presentation public_id (ULID)"),
 *   @OA\Property(property="supplier_code", type="string", maxLength=100, nullable=true, example="ARROZ-20KG"),
 *   @OA\Property(property="quoted_price", type="number", format="float", minimum=0, example=480, description="Reference quotation; never the posted acquisition cost"),
 *   @OA\Property(property="currency", type="string", minLength=3, maxLength=3, default="MXN", example="MXN"),
 *   @OA\Property(property="valid_from", type="string", format="date", nullable=true),
 *   @OA\Property(property="valid_until", type="string", format="date", nullable=true),
 *   @OA\Property(property="minimum_order_quantity", type="number", format="float", minimum=0.0001, default=1),
 *   @OA\Property(property="lead_time_days", type="integer", minimum=0, nullable=true, example=3),
 *   @OA\Property(property="is_active", type="boolean", default=true)
 * )
 */
class StoreSupplierOfferingRequest extends SupplierOfferingRequest
{
    /**
     * Shared with CreateSupplierOfferingController, which surfaces the same message when the
     * pre-check below loses a TOCTOU race against the database's unique index.
     */
    public const DUPLICATE_PRESENTATION_MESSAGE = 'Este proveedor ya ofrece la presentación seleccionada.';

    public function rules(): array
    {
        $rules = $this->commercialRules();
        $rules['quoted_price'] = ['required', ...$rules['quoted_price']];
        $rules['currency'] = ['nullable', ...$rules['currency']];
        $rules['valid_until'][] = 'after_or_equal:valid_from';
        $rules['minimum_order_quantity'] = ['nullable', ...$rules['minimum_order_quantity']];
        $rules['is_active'] = ['nullable', ...$rules['is_active']];

        return [
            'variant_purchase_presentation_id' => ['required', 'string', 'exists:variant_purchase_presentations,public_id'],
            ...$rules,
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            ...parent::messages(),
            ...$this->supplierOfferingMessages([
                'variant_purchase_presentation_id.required',
                'variant_purchase_presentation_id.string',
                'variant_purchase_presentation_id.exists',
                'quoted_price.required',
                'valid_until.after_or_equal',
            ]),
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            /** @var Supplier $supplier */
            $supplier = $this->route('supplier');

            if (! $supplier->is_active) {
                $validator->errors()->add('supplier', 'No se pueden registrar ofertas para un proveedor inactivo.');
            }

            if ($validator->errors()->has('variant_purchase_presentation_id')) {
                return;
            }

            $presentation = VariantPurchasePresentation::with('itemVariant.item')
                ->where('public_id', $this->input('variant_purchase_presentation_id'))
                ->first();

            $variant = $presentation?->itemVariant;

            if (! $presentation || ! $presentation->is_active || ! $variant?->is_active || ! $variant->item?->is_active) {
                $validator->errors()->add('variant_purchase_presentation_id', 'La presentación de compra seleccionada debe estar activa.');

                return;
            }

            $duplicate = SupplierOffering::where('supplier_id', $supplier->id)
                ->where('variant_purchase_presentation_id', $presentation->id)
                ->exists();

            if ($duplicate) {
                $validator->errors()->add('variant_purchase_presentation_id', self::DUPLICATE_PRESENTATION_MESSAGE);
            }
        });
    }

    /** @return array<string, mixed> */
    public function offeringData(): array
    {
        $data = $this->validated();
        $data['variant_purchase_presentation_id'] = VariantPurchasePresentation::where(
            'public_id',
            $data['variant_purchase_presentation_id']
        )->firstOrFail()->getKey();
        $data['currency'] ??= 'MXN';
        $data['minimum_order_quantity'] ??= 1;
        $data['is_active'] ??= true;

        return $data;
    }
}
