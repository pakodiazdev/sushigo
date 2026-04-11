<?php

namespace App\Http\Requests\Employees;

use App\Models\Employee;
use App\Models\User;
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
        /** @var Employee $employee */
        $employee = $this->route('employee');

        if ($employee->user === null) {
            abort(404, 'Este empleado no tiene una cuenta de usuario vinculada.');
        }

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

    public function getValidatedUser(): User
    {
        /** @var Employee $employee */
        $employee = $this->route('employee');

        return $employee->user ?? throw new \LogicException('User is null — authorize() should have caught this.');
    }
}
