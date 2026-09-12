<?php

declare(strict_types=1);

namespace App\Http\Requests\Inventory\Receipt\Concerns;

trait SharesReceiptValidationMessages
{
    /** @var array<string, string> */
    private const MESSAGES = [
        'supplier_id.required' => 'El proveedor es requerido.',
        'supplier_id.exists' => 'El proveedor seleccionado no existe.',
        'destination_location_id.required' => 'La ubicación de destino es requerida.',
        'destination_location_id.exists' => 'La ubicación de destino seleccionada no existe.',
        'receipt_date.required' => 'La fecha de recepción es requerida.',
        'receipt_date.date' => 'La fecha de recepción debe ser una fecha válida.',
        'lines.required' => 'La recepción debe tener al menos una línea.',
        'lines.min' => 'La recepción debe tener al menos una línea.',
        'lines.*.variant_purchase_presentation_id.required' => 'La presentación de compra es requerida.',
        'lines.*.variant_purchase_presentation_id.exists' => 'La presentación de compra seleccionada no existe.',
        'lines.*.supplier_offering_id.exists' => 'La oferta de proveedor seleccionada no existe.',
        'lines.*.received_packages.required' => 'La cantidad recibida es requerida.',
        'lines.*.received_packages.min' => 'La cantidad recibida debe ser mayor a 0.',
        'lines.*.ordered_packages.decimal' => 'Los paquetes pedidos deben tener máximo 4 decimales.',
        'lines.*.received_packages.decimal' => 'La cantidad recibida debe tener máximo 4 decimales.',
        'lines.*.bonus_packages.decimal' => 'Los paquetes de bonificación deben tener máximo 4 decimales.',
        'lines.*.gross_amount.decimal' => 'El monto bruto debe tener máximo 2 decimales.',
        'lines.*.discounts.decimal' => 'Los descuentos deben tener máximo 2 decimales.',
        'lines.*.allocated_expenses.decimal' => 'Los gastos asignados deben tener máximo 2 decimales.',
        'lines.*.non_recoverable_taxes.decimal' => 'Los impuestos no recuperables deben tener máximo 2 decimales.',
        'lines.*.gross_amount.max' => 'El monto bruto excede el máximo permitido.',
        'lines.*.discounts.max' => 'Los descuentos exceden el máximo permitido.',
        'lines.*.allocated_expenses.max' => 'Los gastos asignados exceden el máximo permitido.',
        'lines.*.non_recoverable_taxes.max' => 'Los impuestos no recuperables exceden el máximo permitido.',
    ];

    /**
     * @param  array<int, string>  $keys
     * @return array<string, string>
     */
    private function receiptMessages(array $keys): array
    {
        return array_intersect_key(self::MESSAGES, array_flip($keys));
    }
}
