<?php

namespace App\Http\Requests\EmployeeRequests;

use App\Enums\EmployeeRequestStatus;
use App\Enums\EmployeeRequestType;
use App\Http\Traits\HandlesSortableRequest;
use App\Models\Employee;
use App\Models\User;
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
            'branch_id' => ['nullable', 'integer', Rule::exists('branches', 'id')],
            'type' => ['nullable', Rule::in(array_map(fn (EmployeeRequestType $type) => $type->value, EmployeeRequestType::cases()))],
            'status' => ['nullable', 'array'],
            'status.*' => ['required', Rule::in(array_map(fn (EmployeeRequestStatus $status) => $status->value, EmployeeRequestStatus::cases()))],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            ...$this->sortRules(),
        ];
    }

    /**
     * Returns the branch ID that should be used to scope the query.
     *
     * Managers are always restricted to their own branch regardless of any
     * branch_id sent in the request. Admins and super-admins may pass an
     * optional branch_id filter. Everyone else is unrestricted.
     */
    public function effectiveBranchId(): ?int
    {
        $user = $this->user();

        if ($user instanceof User
            && $user->hasRole(Employee::ROLE_MANAGER)
            && ! $user->hasAnyRole([Employee::ROLE_ADMIN, Employee::ROLE_SUPER_ADMIN])
        ) {
            $employee = Employee::query()->where('user_id', $user->id)->first();
            $activePeriod = $employee?->employmentPeriods()->active()->first();

            if ($activePeriod !== null) {
                return $activePeriod->branch_id;
            }
        }

        return $this->filled('branch_id') ? $this->integer('branch_id') : null;
    }
}
