<?php

declare(strict_types=1);

namespace App\Http\Requests\Inventory\VariantPurchasePresentation;

use App\Http\Requests\Concerns\ResolvesPublicIdReferences;
use App\Models\Item;
use App\Models\ItemVariant;
use App\Models\PurchasePresentationTemplate;
use App\Models\VariantPurchasePresentation;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

/**
 * @OA\Schema(
 *   schema="StoreVariantPurchasePresentationRequest",
 *   required={"template_id"},
 *
 *   @OA\Property(property="template_id", type="string", example="01JKXYZ1234567890ABCDEFGH", description="Purchase Presentation Template public_id (ULID)"),
 *   @OA\Property(property="package_barcode", type="string", nullable=true, maxLength=50, example="7501234567913", description="Barcode printed on the package — separate namespace from the Variant's unit barcode"),
 *   @OA\Property(property="is_default", type="boolean", example=false, description="Whether this becomes the Variant's default presentation (default: false)")
 * )
 */
class StoreVariantPurchasePresentationRequest extends FormRequest
{
    use ResolvesPublicIdReferences;

    public function authorize(): bool
    {
        $product = Item::where('type', Item::TYPE_PRODUCTO)->where('public_id', $this->route('id'))->firstOrFail();
        ItemVariant::where('item_id', $product->id)->where('public_id', $this->route('variantId'))->firstOrFail();

        return true;
    }

    public function rules(): array
    {
        return [
            'template_id' => ['required', 'string', 'exists:purchase_presentation_templates,public_id'],
            'package_barcode' => ['nullable', 'string', 'max:50', 'unique:variant_purchase_presentations,package_barcode'],
            'is_default' => ['nullable', 'boolean'],
        ];
    }

    public function prepareForValidation(): void
    {
        if ($this->filled('package_barcode')) {
            $this->merge(['package_barcode' => preg_replace('/[^0-9A-Z]/', '', strtoupper((string) $this->package_barcode))]);
        }
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $this->validateTemplateAssignable($validator);
        });
    }

    /**
     * Split into resolveAssignableTemplate()/validateAgainstVariant() to keep
     * each method's own return-statement count low (php:S1142) — see their
     * docblocks for what each check actually guards against.
     */
    private function validateTemplateAssignable(Validator $validator): void
    {
        if (! $this->filled('template_id') || $validator->errors()->has('template_id')) {
            return;
        }

        $template = $this->resolveAssignableTemplate($validator);

        if ($template) {
            $this->validateAgainstVariant($validator, $template);
        }
    }

    /**
     * Resolves the template and confirms it can accept a new assignment at
     * all, independent of which Variant it's being assigned to.
     *
     * The `exists` rule above checks the raw table (including soft-deleted
     * rows), so a since-deleted template's public_id still passes it. The
     * lookup here respects the SoftDeletes scope, so a deleted template
     * resolves to null and must be rejected explicitly instead of silently
     * skipping the active/UOM-compatibility checks below.
     */
    private function resolveAssignableTemplate(Validator $validator): ?PurchasePresentationTemplate
    {
        $template = PurchasePresentationTemplate::where('public_id', $this->input('template_id'))->first();

        if (! $template) {
            $validator->errors()->add('template_id', 'This template no longer exists.');

            return null;
        }

        if (! $template->is_active) {
            $validator->errors()->add('template_id', 'This template is inactive and cannot be assigned to new Variants.');

            return null;
        }

        return $template;
    }

    /**
     * Compatibility check ("Ambiguous Box -> Unit global conversion is not
     * introduced") — a template can only be assigned to a Variant whose base
     * UOM matches the template's compatible_dimension_uom_id. Also rejects a
     * duplicate active assignment of the same template to the same Variant —
     * the DB partial unique index (variant_purchase_presentations_unique_pair)
     * is the backstop, this is what turns the race into a clean 422 for the
     * common, non-racing case.
     */
    private function validateAgainstVariant(Validator $validator, PurchasePresentationTemplate $template): void
    {
        $variant = ItemVariant::where('public_id', $this->route('variantId'))->first();

        if (! $variant) {
            return;
        }

        if ((int) $template->compatible_dimension_uom_id !== (int) $variant->uom_id) {
            $validator->errors()->add('template_id', "This template's compatible unit does not match the Variant's base unit of measure.");

            return;
        }

        $alreadyAssigned = VariantPurchasePresentation::where('item_variant_id', $variant->id)
            ->where('template_id', $template->id)
            ->exists();

        if ($alreadyAssigned) {
            $validator->errors()->add('template_id', 'This template is already assigned to this Variant.');
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function presentationData(): array
    {
        $data = $this->validated();
        $data['template_id'] = $this->resolvePublicId(PurchasePresentationTemplate::class, 'template_id');
        $data['is_default'] ??= false;
        $data['is_active'] = true;
        $data['meta'] = [];

        return $data;
    }
}
