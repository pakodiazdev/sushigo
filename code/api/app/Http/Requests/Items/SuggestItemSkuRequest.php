<?php

namespace App\Http\Requests\Items;

use App\Models\Item;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * @OA\Schema(
 *   schema="SuggestItemSkuRequest",
 *
 *   @OA\Property(property="name", type="string", maxLength=255, nullable=true, example="Salmón fresco", description="Item name the contextual prefix is derived from. Omitted/blank yields the generic fallback prefix."),
 *   @OA\Property(property="type", type="string", enum={"INSUMO", "ACTIVO"}, nullable=true, example="INSUMO", description="Optional Item type hint — validated for scope, not used in the prefix."),
 * )
 */
class SuggestItemSkuRequest extends FormRequest
{
    public function authorize(): bool
    {
        // The route's `permission:items.create` middleware is the guard; keeping
        // this open mirrors SuggestSupplierCodeController / SuggestEmployeeCodeController.
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['nullable', 'string', 'max:255'],
            'type' => ['nullable', 'string', Rule::in([Item::TYPE_INSUMO, Item::TYPE_ACTIVO])],
        ];
    }

    /**
     * The raw name used to derive the contextual prefix — null when absent.
     */
    public function contextName(): ?string
    {
        $name = $this->validated('name');

        return is_string($name) && $name !== '' ? $name : null;
    }
}
