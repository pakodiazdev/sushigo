<?php

declare(strict_types=1);

namespace App\Http\Requests\Inventory\VariantPurchasePresentation;

use App\Models\Item;
use App\Models\ItemVariant;
use App\Models\VariantPurchasePresentation;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * template_id is immutable on update — reassigning an assignment to a
 * different template is a new assignment, not an edit (see Store request's
 * docblock on why the package factor/shape can't drift under an existing
 * assignment either).
 *
 * @OA\Schema(
 *   schema="UpdateVariantPurchasePresentationRequest",
 *
 *   @OA\Property(property="package_barcode", type="string", nullable=true, maxLength=50),
 *   @OA\Property(property="is_default", type="boolean"),
 *   @OA\Property(property="is_active", type="boolean")
 * )
 */
class UpdateVariantPurchasePresentationRequest extends FormRequest
{
    public function authorize(): bool
    {
        $product = Item::where('type', Item::TYPE_PRODUCTO)->findOrFail($this->route('id'));
        $variant = ItemVariant::where('item_id', $product->id)->findOrFail($this->route('variantId'));

        VariantPurchasePresentation::where('item_variant_id', $variant->id)
            ->where('public_id', $this->route('presentationId'))
            ->firstOrFail();

        return true;
    }

    public function rules(): array
    {
        $presentation = VariantPurchasePresentation::where('item_variant_id', $this->route('variantId'))
            ->where('public_id', $this->route('presentationId'))
            ->first();

        return [
            'package_barcode' => ['sometimes', 'nullable', 'string', 'max:50', Rule::unique('variant_purchase_presentations', 'package_barcode')->ignore($presentation?->id)],
            'is_default' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    public function prepareForValidation(): void
    {
        if ($this->filled('package_barcode')) {
            $this->merge(['package_barcode' => preg_replace('/[^0-9A-Z]/', '', strtoupper((string) $this->package_barcode))]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function presentationData(): array
    {
        return $this->validated();
    }
}
