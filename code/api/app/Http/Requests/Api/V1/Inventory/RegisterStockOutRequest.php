<?php

namespace App\Http\Requests\Api\V1\Inventory;

use App\Models\StockMovement;
use Illuminate\Foundation\Http\FormRequest;
use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'RegisterStockOutRequest',
    required: ['inventory_location_id', 'item_variant_id', 'qty', 'uom_id', 'reason'],
    properties: [
        new OA\Property(property: 'inventory_location_id', type: 'integer', example: 1),
        new OA\Property(property: 'item_variant_id', type: 'integer', example: 1),
        new OA\Property(property: 'qty', type: 'number', format: 'decimal', example: 10.5),
        new OA\Property(property: 'uom_id', type: 'integer', example: 1),
        new OA\Property(
            property: 'reason',
            type: 'string',
            enum: ['SALE', 'CONSUMPTION'],
            example: 'SALE'
        ),
        new OA\Property(property: 'sale_price', type: 'number', format: 'decimal', nullable: true, example: 15.50),
        new OA\Property(property: 'reference', type: 'string', nullable: true, example: 'SALE-001'),
        new OA\Property(property: 'notes', type: 'string', nullable: true, example: 'Sale to customer'),
    ]
)]
class RegisterStockOutRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'inventory_location_id' => ['required', 'integer', 'exists:inventory_locations,id'],
            'item_variant_id' => ['required', 'integer', 'exists:item_variants,id'],
            'qty' => ['required', 'numeric', 'min:0.0001'],
            'uom_id' => ['required', 'integer', 'exists:units_of_measure,id'],
            'reason' => ['required', 'string', 'in:' . StockMovement::REASON_SALE . ',' . StockMovement::REASON_CONSUMPTION],
            'sale_price' => ['nullable', 'numeric', 'min:0'],
            'reference' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:500'],
        ];
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'inventory_location_id.required' => 'The inventory location is required.',
            'inventory_location_id.exists' => 'The selected inventory location does not exist.',
            'item_variant_id.required' => 'The item variant is required.',
            'item_variant_id.exists' => 'The selected item variant does not exist.',
            'qty.required' => 'The quantity is required.',
            'qty.min' => 'The quantity must be greater than 0.',
            'uom_id.required' => 'The unit of measure is required.',
            'uom_id.exists' => 'The selected unit of measure does not exist.',
            'reason.required' => 'The movement reason is required.',
            'reason.in' => 'The reason must be either SALE or CONSUMPTION.',
        ];
    }
}
