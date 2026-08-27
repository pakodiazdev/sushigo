<?php

declare(strict_types=1);

namespace App\Http\Requests\Inventory\ReplenishmentPolicy;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

/**
 * @OA\Schema(
 *   schema="UpsertReplenishmentPolicyRequest",
 *   required={"min_stock", "max_stock"},
 *
 *   @OA\Property(property="min_stock", type="number", format="float", minimum=0, example=10, description="Reorder point at this location — on_hand at or below this is low"),
 *   @OA\Property(property="max_stock", type="number", format="float", minimum=0, example=120, description="Target ceiling at this location; must be >= min_stock"),
 *   @OA\Property(property="notes", type="string", nullable=true, maxLength=500, example="Bar fridge only holds two crates", description="Free-text operational note")
 * )
 */
class UpsertReplenishmentPolicyRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Route middleware (permission:stock.manage) is the gate; the request
        // just needs to resolve.
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'min_stock' => ['required', 'numeric', 'min:0'],
            'max_stock' => ['required', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string', 'max:500'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            if ($this->filled('min_stock') && $this->filled('max_stock') && (float) $this->input('max_stock') < (float) $this->input('min_stock')) {
                $validator->errors()->add('max_stock', 'Maximum stock must be greater than or equal to minimum stock.');
            }
        });
    }

    /**
     * Ready-to-persist attributes for the (location, variant) policy row.
     *
     * @return array<string, mixed>
     */
    public function policyData(): array
    {
        return [
            'min_stock' => (float) $this->input('min_stock'),
            'max_stock' => (float) $this->input('max_stock'),
            'notes' => $this->input('notes'),
        ];
    }
}
