<?php

namespace App\Http\Requests\Employees;

use App\Models\WageHistory;
use Illuminate\Foundation\Http\FormRequest;

class StoreWageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('employees.update');
    }

    public function rules(): array
    {
        return WageHistory::RULES;
    }
}
