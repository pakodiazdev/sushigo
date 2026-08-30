<?php

declare(strict_types=1);

namespace App\Http\Requests\Inventory\PurchasePresentationTemplate;

use App\Http\Requests\Concerns\ResolvesPublicIdReferences;
use App\Http\Requests\Inventory\PurchasePresentationTemplate\Concerns\ValidatesPurchasePresentationTemplateQuantity;
use App\Models\PurchasePresentationTemplate;
use App\Models\UnitOfMeasure;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * @OA\Schema(
 *   schema="UpdatePurchasePresentationTemplateRequest",
 *
 *   @OA\Property(property="code", type="string", maxLength=50),
 *   @OA\Property(property="name", type="string", maxLength=255),
 *   @OA\Property(property="package_type", type="string", enum={"UNIT", "PACK", "BOX", "TRAY"}),
 *   @OA\Property(property="base_unit_quantity", type="number", format="float", minimum=0.0001, maximum=99999999999.9999),
 *   @OA\Property(property="compatible_dimension_uom_id", type="string"),
 *   @OA\Property(property="is_active", type="boolean")
 * )
 */
class UpdatePurchasePresentationTemplateRequest extends FormRequest
{
    use ResolvesPublicIdReferences, ValidatesPurchasePresentationTemplateQuantity;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        /** @var PurchasePresentationTemplate $template */
        $template = $this->route('template');

        return [
            'code' => ['sometimes', 'string', 'max:50', Rule::unique('purchase_presentation_templates', 'code')->ignore($template?->id)->whereNull('deleted_at')],
            'name' => ['sometimes', 'string', 'max:255'],
            'package_type' => ['sometimes', 'string', Rule::in([
                PurchasePresentationTemplate::PACKAGE_TYPE_UNIT,
                PurchasePresentationTemplate::PACKAGE_TYPE_PACK,
                PurchasePresentationTemplate::PACKAGE_TYPE_BOX,
                PurchasePresentationTemplate::PACKAGE_TYPE_TRAY,
            ])],
            'base_unit_quantity' => $this->baseUnitQuantityRules('sometimes'),
            'compatible_dimension_uom_id' => ['sometimes', 'string', 'exists:units_of_measure,public_id'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    public function prepareForValidation(): void
    {
        if ($this->filled('code')) {
            $this->merge(['code' => strtoupper((string) $this->code)]);
        }
    }

    /**
     * A package's shape/factor/compatible UOM is baked into every existing
     * assignment's meaning (e.g. "this Variant has 3 Box x24 on hand")
     * — changing it once the template has ever been assigned would silently
     * reinterpret history, the same risk UpdateVariantRequest already guards
     * for uom_id changes on a Variant with stock/movement history. A no-op
     * resend of the current value is always allowed.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $this->validateImmutableFieldsOnceAssigned($validator);
        });
    }

    private function validateImmutableFieldsOnceAssigned(Validator $validator): void
    {
        /** @var PurchasePresentationTemplate $template */
        $template = $this->route('template');

        if (! $template || ! $template->hasAnyAssignments()) {
            return;
        }

        foreach (['package_type', 'base_unit_quantity', 'compatible_dimension_uom_id'] as $field) {
            if (! $this->filled($field) || $validator->errors()->has($field)) {
                continue;
            }

            // base_unit_quantity is decimal:4 on the model, so it always
            // casts to a fixed-scale string like "24.0000"; the API resource
            // emits it as a plain number (24). A string comparison would
            // report that as a change on every no-op resend of a resource
            // round-trip, so this field is normalized to the same 4-decimal
            // scale on both sides before comparing.
            $submittedValue = $field === 'compatible_dimension_uom_id'
                ? $this->resolvePublicId(UnitOfMeasure::class, $field)
                : $this->input($field);

            $changed = $field === 'base_unit_quantity'
                ? number_format((float) $this->input($field), 4, '.', '') !== number_format((float) $template->{$field}, 4, '.', '')
                : (string) $submittedValue !== (string) $template->{$field};

            if ($changed) {
                $validator->errors()->add($field, 'This field cannot be changed once the template has been assigned to a Variant.');
            }
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function templateData(): array
    {
        $data = $this->validated();

        if (array_key_exists('compatible_dimension_uom_id', $data)) {
            $data['compatible_dimension_uom_id'] = $this->resolvePublicId(UnitOfMeasure::class, 'compatible_dimension_uom_id');
        }

        return $data;
    }
}
