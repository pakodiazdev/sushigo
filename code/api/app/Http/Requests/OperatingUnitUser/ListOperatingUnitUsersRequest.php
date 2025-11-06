<?php

namespace App\Http\Requests\OperatingUnitUser;

use Illuminate\Foundation\Http\FormRequest;

/**
 * @OA\Schema(
 *   schema="ListOperatingUnitUsersRequest",
 *   @OA\Property(property="per_page", type="integer", example=15),
 * )
 */
class ListOperatingUnitUsersRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }
}
