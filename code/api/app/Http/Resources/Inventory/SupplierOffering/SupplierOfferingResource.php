<?php

declare(strict_types=1);

namespace App\Http\Resources\Inventory\SupplierOffering;

use App\Http\Resources\BaseResource;
use App\Models\SupplierOffering;

/** @mixin SupplierOffering */
class SupplierOfferingResource extends BaseResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->public_id,
            'supplier' => $this->whenLoaded('supplier', fn () => [
                'id' => $this->supplier->public_id,
                'code' => $this->supplier->code,
                'name' => $this->supplier->name,
            ]),
            'presentation' => $this->whenLoaded('presentation', fn () => $this->presentationSummary()),
            'supplier_code' => $this->supplier_code,
            'quoted_price' => (float) $this->quoted_price,
            'currency' => $this->currency,
            'valid_from' => $this->valid_from?->toDateString(),
            'valid_until' => $this->valid_until?->toDateString(),
            'minimum_order_quantity' => (float) $this->minimum_order_quantity,
            'lead_time_days' => $this->lead_time_days,
            'is_active' => $this->is_active,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }

    /** @return array<string, mixed> */
    private function presentationSummary(): array
    {
        $presentation = $this->presentation;
        $product = null;

        if ($presentation->itemVariant?->item) {
            $product = [
                'id' => $presentation->itemVariant->item->public_id,
                'name' => $presentation->itemVariant->item->name,
            ];
        }

        return [
            'id' => $presentation->public_id,
            'package_barcode' => $presentation->package_barcode,
            'template' => $presentation->template ? [
                'id' => $presentation->template->public_id,
                'code' => $presentation->template->code,
                'name' => $presentation->template->name,
                'package_type' => $presentation->template->package_type,
                'base_unit_quantity' => (float) $presentation->template->base_unit_quantity,
            ] : null,
            'variant' => $presentation->itemVariant ? [
                'id' => $presentation->itemVariant->public_id,
                'code' => $presentation->itemVariant->code,
                'name' => $presentation->itemVariant->name,
                'product' => $product,
            ] : null,
        ];
    }
}
