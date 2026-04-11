<?php

namespace App\Http\Requests\Employees;

use Illuminate\Foundation\Http\FormRequest;
use Spatie\Permission\Models\Permission;

class SyncUserPermissionsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $validSlugs = Permission::where('guard_name', 'api')
            ->pluck('name')
            ->toArray();

        return [
            'grant' => ['sometimes', 'array'],
            'grant.*' => ['string', 'in:'.implode(',', $validSlugs)],
            'revoke' => ['sometimes', 'array'],
            'revoke.*' => ['string', 'in:'.implode(',', $validSlugs)],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'grant.*.in' => 'El permiso ":input" no existe.',
            'revoke.*.in' => 'El permiso ":input" no existe.',
        ];
    }
}
