<?php

declare(strict_types=1);

namespace App\Http\Requests\Inventory\Variant;

use App\Models\UnitOfMeasure;
use Illuminate\Foundation\Http\FormRequest;

/** @OA\Schema(schema="SuggestVariantSkuRequest", required={"name", "uom_id"}, @OA\Property(property="name", type="string", maxLength=255, example="500 g"), @OA\Property(property="uom_id", type="string", example="01K4M6QY8E2B7N9Z3T5V1W0XCD")) */
class SuggestVariantSkuRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'uom_id' => ['required', 'string', 'exists:units_of_measure,public_id'],
        ];
    }

    public function variantName(): string
    {
        return $this->validated('name');
    }

    public function unitOfMeasure(): UnitOfMeasure
    {
        return UnitOfMeasure::where('public_id', $this->validated('uom_id'))->firstOrFail();
    }
}
