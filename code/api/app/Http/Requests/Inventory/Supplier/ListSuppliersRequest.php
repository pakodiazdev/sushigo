<?php

declare(strict_types=1);

namespace App\Http\Requests\Inventory\Supplier;

use Illuminate\Foundation\Http\FormRequest;

/**
 * @OA\Schema(
 *   schema="ListSuppliersRequest",
 *
 *   @OA\Property(property="search", type="string", maxLength=100, description="Search by supplier name or code"),
 *   @OA\Property(property="is_active", type="boolean")
 * )
 */
class ListSuppliersRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('is_active')) {
            $this->merge([
                'is_active' => filter_var($this->input('is_active'), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE),
            ]);
        }
    }

    public function rules(): array
    {
        return [
            'search' => ['nullable', 'string', 'max:100'],
            'is_active' => ['nullable', 'boolean'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'search.string' => 'La búsqueda debe ser texto.',
            'search.max' => 'La búsqueda no puede exceder 100 caracteres.',
            'is_active.boolean' => 'El filtro de estado debe ser verdadero o falso.',
        ];
    }
}
