<?php

declare(strict_types=1);

namespace App\Http\Requests\Inventory\Supplier;

use App\Http\Requests\Inventory\Supplier\Concerns\SharesSupplierValidationMessages;
use Illuminate\Foundation\Http\FormRequest;

abstract class SupplierRequest extends FormRequest
{
    use SharesSupplierValidationMessages;

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('code')) {
            $code = trim((string) $this->input('code'));
            $this->merge(['code' => $code === '' ? null : strtoupper($code)]);
        }
    }

    /**
     * @param  array<int, mixed>  $codeRules
     * @return array<string, array<int, mixed>>
     */
    protected function supplierRules(array $codeRules, string $namePresence, string $activePresence): array
    {
        return [
            'code' => $codeRules,
            'name' => [$namePresence, 'string', 'max:255'],
            'contact_name' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'is_active' => [$activePresence, 'boolean'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return $this->supplierMessages([
            'code.string',
            'code.max',
            'code.unique',
            'name.string',
            'name.max',
            'contact_name.string',
            'contact_name.max',
            'email.email',
            'email.max',
            'phone.string',
            'phone.max',
            'is_active.boolean',
        ]);
    }

    /** @return array<string, mixed> */
    public function supplierData(): array
    {
        return $this->validated();
    }
}
