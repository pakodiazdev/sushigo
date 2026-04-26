<?php

namespace App\Http\Requests\EmployeeRequests;

use Illuminate\Foundation\Http\FormRequest;

class ApproveEmployeeRequestRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'salary_pct' => ['nullable', 'numeric', 'min:0', 'max:200'],
            'salary_day' => ['nullable', 'numeric', 'min:0'],
            'prima_pct' => ['nullable', 'numeric', 'min:0', 'max:200'],
            'prima' => ['nullable', 'numeric', 'min:0'],
            'seventh_day' => ['nullable', 'numeric', 'min:0'],
            'total' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
