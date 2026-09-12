<?php

declare(strict_types=1);

namespace App\Http\Requests\Inventory\Variant;

use App\Models\Item;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Query filters for the Product-scoped variant listing.
 *
 * Mirrors App\Http\Requests\Inventory\Product\ListProductsRequest so a caller
 * (the webapp's supplier-offering form, #506) can send is_active=true/false —
 * the way axios serializes a JS boolean — without the endpoint 422-ing on the
 * bare `boolean` rule, which only accepts 1/0/"1"/"0".
 *
 * @OA\Schema(
 *   schema="ListVariantsRequest",
 *
 *   @OA\Property(property="search", type="string", description="Case-insensitive match on variant name or code"),
 *   @OA\Property(property="is_active", type="boolean"),
 *   @OA\Property(property="per_page", type="integer", example=15),
 * )
 */
class ListVariantsRequest extends FormRequest
{
    private ?Item $product = null;

    /**
     * Resolves the Product-scoped route id here, before the `rules()` below run — the
     * FormRequest lifecycle validates prepareForValidation() then authorize() then rules(),
     * so a 404 for an unknown/non-Product id still wins over a 422 for an invalid filter,
     * matching the ordering the endpoint's manual $request->validate() call used to have
     * before it was replaced by this FormRequest (PR #617 review).
     */
    public function authorize(): bool
    {
        $this->product = Item::where('type', Item::TYPE_PRODUCTO)
            ->where('public_id', $this->route('id'))
            ->firstOrFail();

        return true;
    }

    public function product(): Item
    {
        return $this->product;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('is_active') && is_scalar($this->is_active)) {
            $normalized = filter_var($this->is_active, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);

            // Only normalize recognized boolean literals (1/0/true/false/on/off/yes/no).
            // Leave anything else untouched so the `boolean` rule below rejects it with a 422,
            // instead of FILTER_NULL_ON_FAILURE silently turning it into null (PR #617 review).
            if ($normalized !== null) {
                $this->merge(['is_active' => $normalized]);
            }
        }
    }

    public function rules(): array
    {
        return [
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'search' => ['sometimes', 'nullable', 'string', 'max:255'],
            'is_active' => ['sometimes', 'nullable', 'boolean'],
        ];
    }
}
