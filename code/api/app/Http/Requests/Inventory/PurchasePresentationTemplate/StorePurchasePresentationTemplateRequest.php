<?php

declare(strict_types=1);

namespace App\Http\Requests\Inventory\PurchasePresentationTemplate;

use App\Http\Requests\Concerns\ResolvesPublicIdReferences;
use App\Models\PurchasePresentationTemplate;
use App\Models\UnitOfMeasure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * @OA\Schema(
 *   schema="StorePurchasePresentationTemplateRequest",
 *   required={"code", "name", "package_type", "base_unit_quantity", "compatible_dimension_uom_id"},
 *
 *   @OA\Property(property="code", type="string", maxLength=50, example="BOX_24"),
 *   @OA\Property(property="name", type="string", maxLength=255, example="Box x24"),
 *   @OA\Property(property="package_type", type="string", enum={"UNIT", "PACK", "BOX", "TRAY"}, example="BOX"),
 *   @OA\Property(property="base_unit_quantity", type="number", format="float", example=24, description="How many base UOM units this package contains"),
 *   @OA\Property(property="compatible_dimension_uom_id", type="string", example="01K4M6QY8E2B7N9Z3T5V1W0XCD", description="Public ID of the base UOM a Variant must use to accept this template"),
 *   @OA\Property(property="is_active", type="boolean", example=true, description="Active status (default: true)")
 * )
 */
class StorePurchasePresentationTemplateRequest extends FormRequest
{
    use ResolvesPublicIdReferences;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'code' => ['required', 'string', 'max:50', Rule::unique('purchase_presentation_templates', 'code')->whereNull('deleted_at')],
            'name' => ['required', 'string', 'max:255'],
            'package_type' => ['required', 'string', Rule::in([
                PurchasePresentationTemplate::PACKAGE_TYPE_UNIT,
                PurchasePresentationTemplate::PACKAGE_TYPE_PACK,
                PurchasePresentationTemplate::PACKAGE_TYPE_BOX,
                PurchasePresentationTemplate::PACKAGE_TYPE_TRAY,
            ])],
            'base_unit_quantity' => ['required', 'numeric', 'min:0.0001'],
            'compatible_dimension_uom_id' => ['required', 'string', 'exists:units_of_measure,public_id'],
            'is_active' => ['nullable', 'boolean'],
        ];
    }

    public function prepareForValidation(): void
    {
        if ($this->filled('code')) {
            $this->merge(['code' => strtoupper((string) $this->code)]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function templateData(): array
    {
        $data = $this->validated();
        $data['compatible_dimension_uom_id'] = $this->resolvePublicId(UnitOfMeasure::class, 'compatible_dimension_uom_id');
        $data['is_active'] ??= true;

        return $data;
    }
}
