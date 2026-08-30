<?php

declare(strict_types=1);

namespace App\Http\Requests\Inventory\PurchasePresentationTemplate;

use App\Http\Requests\Inventory\PurchasePresentationTemplate\Concerns\ValidatesPurchasePresentationTemplateQuantity;
use App\Models\PurchasePresentationTemplate;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SuggestPurchasePresentationTemplateCodeRequest extends FormRequest
{
    use ValidatesPurchasePresentationTemplateQuantity;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'package_type' => ['required', 'string', Rule::in([
                PurchasePresentationTemplate::PACKAGE_TYPE_UNIT,
                PurchasePresentationTemplate::PACKAGE_TYPE_PACK,
                PurchasePresentationTemplate::PACKAGE_TYPE_BOX,
                PurchasePresentationTemplate::PACKAGE_TYPE_TRAY,
            ])],
            'base_unit_quantity' => $this->baseUnitQuantityRules('required'),
            'compatible_dimension_uom_id' => ['required', 'string', 'exists:units_of_measure,public_id'],
        ];
    }
}
