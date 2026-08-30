<?php

declare(strict_types=1);

namespace App\Http\Requests\Inventory\PurchasePresentationTemplate\Concerns;

use App\Models\PurchasePresentationTemplate;

trait ValidatesPurchasePresentationTemplateQuantity
{
    /** @return array<int, string> */
    protected function baseUnitQuantityRules(string $presence): array
    {
        return [
            $presence,
            'numeric',
            'min:0.0001',
            'max:'.PurchasePresentationTemplate::MAX_BASE_UNIT_QUANTITY,
            'decimal:0,4',
        ];
    }
}
