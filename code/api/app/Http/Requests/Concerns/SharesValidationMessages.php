<?php

namespace App\Http\Requests\Concerns;

trait SharesValidationMessages
{
    /**
     * Spanish validation messages shared across CashAdjustments FormRequests,
     * keyed by the same `field.rule` composite key Laravel's messages()
     * expects. Excludes any key whose message differs by domain (e.g.
     * `type.in` means something different for CashAdjustment vs CashRegister)
     * — those stay inline in their own class.
     */
    private const MESSAGES = [
        'cash_session_id.required' => 'La sesión de caja es requerida',
        'type.required' => 'El tipo es requerido',
        'direction.required' => 'La dirección es requerida',
        'direction.in' => 'La dirección debe ser INFLOW o OUTFLOW',
        'lines.required' => 'Debe incluir al menos una línea',
        'lines.min' => 'Debe incluir al menos una línea',
        'lines.*.tender_type.required' => 'El tipo de tender es requerido',
        'lines.*.tender_type.in' => 'El tipo de tender debe ser CASH, CARD o TRANSFER',
        'lines.*.amount.required' => 'El monto es requerido',
        'lines.*.amount.min' => 'El monto debe ser mayor a 0',
        'tender_type.required' => 'El tipo de tender es requerido',
        'tender_type.in' => 'El tipo de tender debe ser CASH, CARD o TRANSFER',
        'amount.required' => 'El monto es requerido',
        'amount.min' => 'El monto debe ser mayor a 0',
        'category.required' => 'La categoría es requerida',
        'cash_register_id.required' => 'La caja es requerida',
        'cash_register_id.exists' => 'La caja no existe',
        'operating_date.required' => 'La fecha de operación es requerida',
        'operating_date.date_format' => 'La fecha debe estar en formato Y-m-d',
        'opening_balance.min' => 'El balance inicial debe ser mayor o igual a 0',
        'opening_balance.max' => 'El balance inicial no puede exceder 999,999.99',
        'closing_balance.min' => 'El balance de cierre debe ser mayor o igual a 0',
        'branch_id.required' => 'La sucursal es requerida',
        'branch_id.exists' => 'La sucursal no existe',
        'name.required' => 'El nombre es requerido',
        'provider.required' => 'El proveedor es requerido',
        'last_four.size' => 'Deben ser exactamente 4 dígitos',
        'last_four.regex' => 'Solo se permiten números',
        'alias.required' => 'El alias es requerido',
        'bank_name.required' => 'El nombre del banco es requerido',
        'account_number_masked.required' => 'El número de cuenta enmascarado es requerido',
        'code.required' => 'El código es requerido',
        'code.unique' => 'El código ya está en uso',
    ];

    /**
     * Select a subset of the shared message map by field.rule key, in the
     * shape Laravel's FormRequest::messages() expects.
     *
     * @param  list<string>  $keys
     * @return array<string, string>
     */
    protected function sharedMessages(array $keys): array
    {
        return array_intersect_key(self::MESSAGES, array_flip($keys));
    }
}
