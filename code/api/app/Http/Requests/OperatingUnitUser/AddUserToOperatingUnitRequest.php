<?php

namespace App\Http\Requests\OperatingUnitUser;

use Illuminate\Foundation\Http\FormRequest;

/**
 * @OA\Schema(
 *   schema="AddUserToOperatingUnitRequest",
 *   required={"user_id"},
 *   @OA\Property(property="user_id", type="integer", example=1),
 * )
 */
class AddUserToOperatingUnitRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'user_id' => ['required', 'integer', 'exists:users,id'],
        ];
    }
}
