<?php

declare(strict_types=1);

namespace App\Http\Requests\Pricing\PriceLists;

use Illuminate\Foundation\Http\FormRequest;

/**
 * @OA\Schema(
 *   schema="UpdatePriceListRequest",
 *
 *   @OA\Property(property="code", type="string", maxLength=50, example="STANDARD"),
 *   @OA\Property(property="name", type="string", maxLength=255, example="Standard Pricing"),
 *   @OA\Property(property="description", type="string", nullable=true),
 *   @OA\Property(property="priority", type="integer", example=0),
 *   @OA\Property(property="is_active", type="boolean", example=true),
 * )
 */
class UpdatePriceListRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('priceList'));
    }

    public function rules(): array
    {
        $priceListId = $this->route('priceList')->id;

        return [
            'code' => ['sometimes', 'string', 'max:50', 'unique:price_lists,code,'.$priceListId],
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'priority' => ['sometimes', 'integer'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function priceListData(): array
    {
        return $this->validated();
    }
}
