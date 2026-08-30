<?php

declare(strict_types=1);

namespace App\Http\Requests\Items;

use App\Http\Requests\Concerns\ResolvesPublicIdReferences;
use App\Models\Item;
use App\Models\UnitOfMeasure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** @OA\Schema(schema="SuggestItemVariantSkuRequest", required={"item_id", "name", "uom_id"}, @OA\Property(property="item_id", type="string", example="01K4M6QY8E2B7N9Z3T5V1W0XCD"), @OA\Property(property="name", type="string", maxLength=255, example="1 kg"), @OA\Property(property="uom_id", type="string", example="01K4M6QY8E2B7N9Z3T5V1W0XCE")) */
class SuggestItemVariantSkuRequest extends FormRequest
{
    use ResolvesPublicIdReferences;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'item_id' => [
                'required',
                'integer',
                Rule::exists('items', 'id')->where(fn ($query) => $query->whereNot('type', Item::TYPE_PRODUCTO)),
            ],
            'name' => ['required', 'string', 'max:255'],
            'uom_id' => ['required', 'integer', 'exists:units_of_measure,id'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'item_id' => $this->normalizePublicIdReference(Item::class, $this->input('item_id')),
            'uom_id' => $this->normalizePublicIdReference(UnitOfMeasure::class, $this->input('uom_id')),
        ]);
    }

    public function item(): Item
    {
        return Item::findOrFail($this->validated('item_id'));
    }

    public function unitOfMeasure(): UnitOfMeasure
    {
        return UnitOfMeasure::findOrFail($this->validated('uom_id'));
    }

    public function variantName(): string
    {
        return $this->validated('name');
    }
}
