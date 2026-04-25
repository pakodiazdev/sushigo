<?php

namespace App\Http\Requests\EmployeeRequests;

use App\Enums\EmployeeRequestStatus;
use App\Enums\EmployeeRequestType;
use App\Http\Traits\HandlesSortableRequest;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ListEmployeeRequestsRequest extends FormRequest
{
    use HandlesSortableRequest;

    public function authorize(): bool
    {
        return true;
    }

    protected function sortableFields(): array
    {
        return ['created_at', 'approved_at', 'status', 'type'];
    }

    protected function defaultSort(): array
    {
        return [['field' => 'created_at', 'direction' => 'desc']];
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('status') && is_string($this->input('status'))) {
            $this->merge(['status' => [$this->input('status')]]);
        }
    }

    public function rules(): array
    {
        return [
            'employee_id' => ['nullable', 'string', Rule::exists('employees', 'public_id')->whereNull('deleted_at')],
            'type' => ['nullable', Rule::in(array_map(fn (EmployeeRequestType $type) => $type->value, EmployeeRequestType::cases()))],
            'status' => ['nullable', 'array'],
            'status.*' => ['required', Rule::in(array_map(fn (EmployeeRequestStatus $status) => $status->value, EmployeeRequestStatus::cases()))],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            ...$this->sortRules(),
        ];
    }
}
