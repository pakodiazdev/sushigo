<?php

declare(strict_types=1);

namespace App\Http\Resources\Inventory\Receipt;

use App\Http\Resources\BaseResource;
use App\Models\ReceiptLine;

/** @mixin ReceiptLine */
class ReceiptLineResource extends BaseResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'variant_purchase_presentation_id' => $this->presentation?->public_id,
            'variant' => $this->presentation?->itemVariant ? [
                'id' => $this->presentation->itemVariant->public_id,
                'code' => $this->presentation->itemVariant->code,
                'name' => $this->presentation->itemVariant->name,
            ] : null,
            'supplier_offering_id' => $this->supplierOffering?->public_id,
            'ordered_packages' => (float) $this->ordered_packages,
            'received_packages' => (float) $this->received_packages,
            'bonus_packages' => (float) $this->bonus_packages,
            'presentation_factor' => (float) $this->presentation_factor,
            'gross_amount' => (float) $this->gross_amount,
            'discounts' => (float) $this->discounts,
            'allocated_expenses' => (float) $this->allocated_expenses,
            'non_recoverable_taxes' => (float) $this->non_recoverable_taxes,
            'net_acquisition_amount' => (float) $this->net_acquisition_amount,
            'base_units_received' => (float) $this->base_units_received,
            'effective_unit_cost' => (float) $this->effective_unit_cost,
        ];
    }
}
