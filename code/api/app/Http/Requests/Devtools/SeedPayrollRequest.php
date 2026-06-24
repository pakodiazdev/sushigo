<?php

namespace App\Http\Requests\Devtools;

use App\Enums\SeedScenario;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Enum;

class SeedPayrollRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'branch_id' => ['required', 'integer', 'exists:branches,id'],
            'period_start' => ['required', 'date'],
            'period_end' => ['required', 'date', 'after_or_equal:period_start'],
            'scenario' => ['required', new Enum(SeedScenario::class)],
        ];
    }

    public function branchId(): int
    {
        return (int) $this->validated('branch_id');
    }

    public function periodStart(): string
    {
        return $this->validated('period_start');
    }

    public function periodEnd(): string
    {
        return $this->validated('period_end');
    }

    public function scenario(): SeedScenario
    {
        return SeedScenario::from($this->validated('scenario'));
    }
}
