<?php

namespace App\Http\Requests\AuditLogs;

use App\Models\Attendance;
use App\Models\Employee;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ListAuditLogsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // auditable_type/auditable_id (record mode) and employee_id (employee mode) are
            // mutually exclusive — combining them would AND-intersect both filters in the
            // controller, which is ambiguous and can silently return an empty result set.
            'auditable_type' => ['nullable', 'string', Rule::in([Attendance::class, Employee::class]), 'required_with:auditable_id', 'prohibits:employee_id'],
            'auditable_id' => ['nullable', 'string', 'required_with:auditable_type', 'prohibits:employee_id'],
            // No whereNull('deleted_at') here — a terminated employee's audit trail
            // (e.g. for a compliance/dispute review) must stay reachable after
            // deactivation, not just while the employment period is active.
            'employee_id' => ['nullable', 'string', Rule::exists('employees', 'public_id'), 'prohibits:auditable_type,auditable_id'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ];
    }

    /**
     * The auditable record targeted by "record mode" (auditable_type + auditable_id),
     * or null when the request is in "employee mode" / unfiltered.
     *
     * Resolved via an explicit match — rather than instantiating `$auditable_type` as a
     * class name — so that adding a third auditable type to the `rules()` allow-list
     * without also handling it here fails loudly at this single, obvious spot instead of
     * as an obscure query error deep in the controller.
     */
    public function auditableRecord(): Attendance|Employee|null
    {
        if (! $this->filled('auditable_type') || ! $this->filled('auditable_id')) {
            return null;
        }

        $publicId = $this->validated('auditable_id');

        // Employee::withTrashed() — a terminated employee's own CREATE/UPDATE/DELETE
        // audit entries must stay reachable, not just those of active employees.
        // Attendance has no SoftDeletes, so it needs no such override.
        return match ($this->validated('auditable_type')) {
            Attendance::class => Attendance::query()->where('public_id', $publicId)->firstOrFail(),
            Employee::class => Employee::withTrashed()->where('public_id', $publicId)->firstOrFail(),
        };
    }

    /**
     * The employee targeted by "employee mode" (employee_id), or null when the request
     * is in "record mode" / unfiltered. The `exists` rule in rules() already guarantees
     * a match exists, so firstOrFail() here can't actually fail.
     *
     * withTrashed() — see auditableRecord() for why terminated employees must resolve.
     */
    public function employee(): ?Employee
    {
        if (! $this->filled('employee_id')) {
            return null;
        }

        return Employee::withTrashed()->where('public_id', $this->validated('employee_id'))->firstOrFail();
    }
}
