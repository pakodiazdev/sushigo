<?php

declare(strict_types=1);

namespace App\Http\Requests\Inventory\Product\Concerns;

/**
 * Validation messages shared between CreateProductRequest and
 * UpdateProductRequest — see doc/conventions/backend/avoiding-sonarcloud-duplication.md.
 * Keeps the two FormRequests from carrying an identical inline messages()
 * array.
 */
trait SharesProductValidationMessages
{
    private const PRODUCT_MESSAGES = [
        'brand_id.exists' => 'The selected brand does not exist or is not active.',
    ];

    /**
     * @return array<string, string>
     */
    protected function productValidationMessages(): array
    {
        return self::PRODUCT_MESSAGES;
    }
}
