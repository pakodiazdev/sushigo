<?php

declare(strict_types=1);

namespace App\Http\Requests\Inventory\Brand;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * @OA\Schema(
 *   schema="StoreBrandRequest",
 *   required={"name"},
 *
 *   @OA\Property(property="name", type="string", maxLength=255, example="Coca-Cola"),
 *   @OA\Property(property="is_active", type="boolean", example=true, description="Active status (default: true)")
 * )
 */
class StoreBrandRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255', Rule::unique('brands', 'name')->whereNull('deleted_at')],
            'is_active' => ['nullable', 'boolean'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function brandData(): array
    {
        $data = $this->validated();
        $data['is_active'] ??= true;

        return $data;
    }
}
