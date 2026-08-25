<?php

declare(strict_types=1);

namespace App\Http\Requests\Pricing\PriceLists;

use App\Models\PriceList;
use Illuminate\Foundation\Http\FormRequest;

/**
 * @OA\Schema(
 *   schema="StorePriceListRequest",
 *   required={"code", "name"},
 *
 *   @OA\Property(property="code", type="string", maxLength=50, example="STANDARD", description="Unique price list code"),
 *   @OA\Property(property="name", type="string", maxLength=255, example="Standard Pricing"),
 *   @OA\Property(property="description", type="string", nullable=true),
 *   @OA\Property(property="priority", type="integer", example=0, description="Tiebreaker when multiple active lists resolve for the same context — higher wins (default: 0)"),
 *   @OA\Property(property="is_active", type="boolean", example=true, description="Active status (default: true)"),
 * )
 */
class StorePriceListRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', PriceList::class);
    }

    public function rules(): array
    {
        return [
            'code' => ['required', 'string', 'max:50', 'unique:price_lists,code'],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'priority' => ['nullable', 'integer'],
            'is_active' => ['nullable', 'boolean'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function priceListData(): array
    {
        $data = $this->validated();
        $data['priority'] ??= 0;
        $data['is_active'] ??= true;

        return $data;
    }
}
