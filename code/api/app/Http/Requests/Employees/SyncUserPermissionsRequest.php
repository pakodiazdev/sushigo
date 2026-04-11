<?php

namespace App\Http\Requests\Employees;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * @OA\Schema(
 *     schema="SyncUserPermissionsRequest",
 *     title="Sync User Permissions Request",
 *
 *     @OA\Property(property="grant",  type="array", @OA\Items(type="string"), example={"employees.create"}, description="Permission slugs to grant directly"),
 *     @OA\Property(property="revoke", type="array", @OA\Items(type="string"), example={"employees.update"}, description="Permission slugs to revoke from direct grants")
 * )
 */
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
        $existsInPermissions = Rule::exists('permissions', 'name')->where('guard_name', 'api');

        return [
            'grant' => ['sometimes', 'array'],
            'grant.*' => ['string', $existsInPermissions],
            'revoke' => ['sometimes', 'array'],
            'revoke.*' => ['string', $existsInPermissions],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'grant.*.exists' => 'El permiso ":input" no existe.',
            'revoke.*.exists' => 'El permiso ":input" no existe.',
        ];
    }
}
