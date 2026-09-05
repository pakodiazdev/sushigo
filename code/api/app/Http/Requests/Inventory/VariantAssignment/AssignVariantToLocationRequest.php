<?php

declare(strict_types=1);

namespace App\Http\Requests\Inventory\VariantAssignment;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Assigning a Variant to an Inventory Location (#569) is keyed entirely on the
 * route ({id}, {variantId}) — the record carries no quantity, cost, or
 * threshold — so there is no request body to validate. The FormRequest still
 * exists to keep the write path on the same authorize/validate seam as every
 * other Inventory write.
 */
class AssignVariantToLocationRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Route middleware (permission:stock.manage) is the gate.
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [];
    }
}
