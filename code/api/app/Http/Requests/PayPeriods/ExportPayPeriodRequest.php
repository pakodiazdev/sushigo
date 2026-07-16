<?php

namespace App\Http\Requests\PayPeriods;

use Illuminate\Foundation\Http\FormRequest;

class ExportPayPeriodRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('payroll.preview');
    }

    public function rules(): array
    {
        return [
            'format' => ['sometimes', 'string', 'in:csv'],
        ];
    }
}
