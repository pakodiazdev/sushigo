<?php

declare(strict_types=1);

namespace App\Http\Requests\Inventory\Supplier\Concerns;

trait SharesSupplierValidationMessages
{
    private const SUPPLIER_MESSAGES = [
        'code.required' => 'El código del proveedor es obligatorio.',
        'code.string' => 'El código del proveedor debe ser texto.',
        'code.max' => 'El código del proveedor no puede exceder 50 caracteres.',
        'code.unique' => 'Ya existe un proveedor con este código.',
        'name.required' => 'El nombre del proveedor es obligatorio.',
        'name.string' => 'El nombre del proveedor debe ser texto.',
        'name.max' => 'El nombre del proveedor no puede exceder 255 caracteres.',
        'contact_name.string' => 'El nombre del contacto debe ser texto.',
        'contact_name.max' => 'El nombre del contacto no puede exceder 255 caracteres.',
        'email.email' => 'Ingresa un correo electrónico válido.',
        'email.max' => 'El correo electrónico no puede exceder 255 caracteres.',
        'phone.string' => 'El teléfono debe ser texto.',
        'phone.max' => 'El teléfono no puede exceder 50 caracteres.',
        'is_active.boolean' => 'El estado del proveedor debe ser verdadero o falso.',
    ];

    /**
     * @param  list<string>  $keys
     * @return array<string, string>
     */
    protected function supplierMessages(array $keys): array
    {
        return array_intersect_key(self::SUPPLIER_MESSAGES, array_flip($keys));
    }
}
