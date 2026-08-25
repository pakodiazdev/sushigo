<?php

declare(strict_types=1);

namespace App\Http\Requests\Inventory\SupplierOffering\Concerns;

trait SharesSupplierOfferingValidationMessages
{
    private const SUPPLIER_OFFERING_MESSAGES = [
        'variant_purchase_presentation_id.required' => 'Selecciona una presentación de compra.',
        'variant_purchase_presentation_id.string' => 'La presentación de compra seleccionada no es válida.',
        'variant_purchase_presentation_id.exists' => 'La presentación de compra seleccionada no existe.',
        'supplier_code.string' => 'El código del producto según el proveedor debe ser texto.',
        'supplier_code.max' => 'El código del producto según el proveedor no puede exceder 100 caracteres.',
        'quoted_price.required' => 'El precio cotizado es obligatorio.',
        'quoted_price.numeric' => 'El precio cotizado debe ser un número.',
        'quoted_price.min' => 'El precio cotizado no puede ser negativo.',
        'quoted_price.max' => 'El precio cotizado excede el máximo permitido.',
        'currency.string' => 'La moneda debe ser texto.',
        'currency.size' => 'La moneda debe usar un código ISO de 3 letras.',
        'currency.regex' => 'La moneda debe usar un código ISO válido de 3 letras.',
        'valid_from.date' => 'La fecha de inicio de vigencia no es válida.',
        'valid_until.date' => 'La fecha de fin de vigencia no es válida.',
        'valid_until.after_or_equal' => 'La fecha de fin debe ser igual o posterior a la fecha de inicio.',
        'minimum_order_quantity.numeric' => 'La cantidad mínima debe ser un número.',
        'minimum_order_quantity.gt' => 'La cantidad mínima debe ser mayor a cero.',
        'minimum_order_quantity.max' => 'La cantidad mínima excede el máximo permitido.',
        'lead_time_days.integer' => 'Los días de entrega deben ser un número entero.',
        'lead_time_days.min' => 'Los días de entrega no pueden ser negativos.',
        'lead_time_days.max' => 'Los días de entrega exceden el máximo permitido.',
        'is_active.boolean' => 'El estado de la oferta debe ser verdadero o falso.',
    ];

    /**
     * @param  list<string>  $keys
     * @return array<string, string>
     */
    protected function supplierOfferingMessages(array $keys): array
    {
        return array_intersect_key(self::SUPPLIER_OFFERING_MESSAGES, array_flip($keys));
    }
}
