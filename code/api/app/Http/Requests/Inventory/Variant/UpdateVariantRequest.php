<?php

declare(strict_types=1);

namespace App\Http\Requests\Inventory\Variant;

use App\Models\Item;
use App\Models\ItemVariant;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * @OA\Schema(
 *   schema="UpdateVariantRequest",
 *
 *   @OA\Property(property="name", type="string", maxLength=255),
 *   @OA\Property(property="code", type="string", maxLength=100, description="Variant SKU — unique across all variants"),
 *   @OA\Property(property="barcode", type="string", nullable=true, maxLength=50, description="Optional unit barcode — unique across all variants"),
 *   @OA\Property(property="uom_id", type="integer"),
 *   @OA\Property(property="description", type="string", nullable=true),
 *   @OA\Property(property="track_lot", type="boolean"),
 *   @OA\Property(property="track_serial", type="boolean"),
 *   @OA\Property(property="is_active", type="boolean"),
 * )
 */
class UpdateVariantRequest extends FormRequest
{
    public function authorize(): bool
    {
        $product = Item::where('type', Item::TYPE_PRODUCTO)->findOrFail($this->route('id'));
        $variant = ItemVariant::where('item_id', $product->id)->findOrFail($this->route('variantId'));

        return $this->user()->can('update', $variant);
    }

    public function rules(): array
    {
        $variantId = $this->route('variantId');

        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'code' => ['sometimes', 'string', 'max:100', Rule::unique('item_variants', 'code')->ignore($variantId)],
            'barcode' => ['sometimes', 'nullable', 'string', 'max:50', Rule::unique('item_variants', 'barcode')->ignore($variantId)],
            'uom_id' => ['sometimes', 'integer', 'exists:units_of_measure,id'],
            'description' => ['sometimes', 'nullable', 'string'],
            'track_lot' => ['sometimes', 'boolean'],
            'track_serial' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    public function prepareForValidation(): void
    {
        $data = [];

        if ($this->filled('code')) {
            $data['code'] = strtoupper((string) $this->code);
        }

        if ($this->filled('barcode')) {
            $data['barcode'] = preg_replace('/[^0-9A-Z]/', '', strtoupper((string) $this->barcode));
        }

        $this->merge($data);
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $this->validateBaseUomChange($validator);
        });
    }

    /**
     * stock.on_hand is stored in the variant's base unit, and inventory
     * operations derive conversions from ItemVariant::uom_id — changing it
     * once stock or movement history exists would silently reinterpret
     * existing quantities in the new unit. A no-op resend of the current
     * uom_id is always allowed. A Variant with a purchase presentation is
     * guarded the same way — the assignment's compatible_dimension_uom_id
     * was checked against this uom_id when it was created, and changing the
     * base UOM afterward would silently break that invariant even without
     * any stock or movement history yet.
     */
    private function validateBaseUomChange(Validator $validator): void
    {
        if (! $this->filled('uom_id') || $validator->errors()->has('uom_id')) {
            return;
        }

        $variant = ItemVariant::find($this->route('variantId'));

        if (! $variant || (int) $this->input('uom_id') === $variant->uom_id) {
            return;
        }

        if ($variant->stock()->exists() || $variant->stockMovements()->exists()) {
            $validator->errors()->add('uom_id', 'The base unit of measure cannot be changed once the variant has stock or movement history.');

            return;
        }

        if ($variant->purchasePresentations()->exists()) {
            $validator->errors()->add('uom_id', 'The base unit of measure cannot be changed once the variant has a purchase presentation assigned.');
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function variantData(): array
    {
        return $this->validated();
    }
}
