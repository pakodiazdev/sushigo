<?php

declare(strict_types=1);

namespace App\Http\Requests\Inventory\StockTransfer\Concerns;

trait SharesStockTransferValidationMessages
{
    /** @var array<string, string> */
    private const MESSAGES = [
        'source_location_id.required' => 'La ubicación de origen es requerida.',
        'source_location_id.exists' => 'La ubicación de origen seleccionada no existe.',
        'destination_location_id.required' => 'La ubicación de destino es requerida.',
        'destination_location_id.exists' => 'La ubicación de destino seleccionada no existe.',
        'transfer_date.required' => 'La fecha de traslado es requerida.',
        'transfer_date.date' => 'La fecha de traslado debe ser una fecha válida.',
        'lines.required' => 'El traslado debe tener al menos una línea.',
        'lines.min' => 'El traslado debe tener al menos una línea.',
        'lines.*.item_variant_id.required' => 'La variante es requerida.',
        'lines.*.item_variant_id.exists' => 'La variante seleccionada no existe.',
        'lines.*.entry_uom_id.required' => 'La unidad de medida es requerida.',
        'lines.*.entry_uom_id.exists' => 'La unidad de medida seleccionada no existe.',
        'lines.*.entry_quantity.required' => 'La cantidad es requerida.',
        'lines.*.entry_quantity.min' => 'La cantidad debe ser al menos 0.0001.',
        'lines.*.entry_quantity.max' => 'La cantidad excede el máximo permitido.',
    ];

    /**
     * @param  array<int, string>  $keys
     * @return array<string, string>
     */
    private function stockTransferMessages(array $keys): array
    {
        return array_intersect_key(self::MESSAGES, array_flip($keys));
    }
}
