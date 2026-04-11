<?php

namespace App\Http\Requests\Employees;

use App\Models\Employee;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;

class GetUserPermissionsRequest extends FormRequest
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
        return [];
    }

    public function getValidatedUser(): User
    {
        /** @var Employee $employee */
        $employee = $this->route('employee');

        return $employee->user ?? throw new \LogicException('User is null — authorize() should have caught this.');
    }
}
