<?php

namespace App\Http\Requests\InventoryLocation;

use Illuminate\Foundation\Http\FormRequest;

/**
 * @OA\Schema(
 *   schema="CreateInventoryLocationRequest",
 *   required={"operating_unit_id", "name", "type"},
 *   @OA\Property(property="operating_unit_id", type="integer", example=1, description="Operating unit ID"),
 *   @OA\Property(property="name", type="string", maxLength=255, example="Main Warehouse", description="Location name"),
 *   @OA\Property(property="type", type="string", enum={"MAIN", "TEMP", "KITCHEN", "WASTE", "EVENT"}, example="MAIN", description="Location type"),
 *   @OA\Property(property="priority", type="integer", example=100, description="Location priority (higher = more important)"),
 *   @OA\Property(property="is_primary", type="boolean", example=false, description="Is primary location for this unit"),
 *   @OA\Property(property="is_active", type="boolean", example=true, description="Is location active"),
 *   @OA\Property(property="notes", type="string", example="Main storage area", description="Additional notes"),
 * )
 */
class CreateInventoryLocationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // TODO: Implement proper authorization
    }

    public function rules(): array
    {
        return [
            'operating_unit_id' => ['required', 'integer', 'exists:operating_units,id'],
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'string', 'in:MAIN,TEMP,KITCHEN,WASTE,EVENT'],
            'priority' => ['nullable', 'integer'],
            'is_primary' => ['nullable', 'boolean'],
            'is_active' => ['nullable', 'boolean'],
            'notes' => ['nullable', 'string'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'priority' => $this->priority ?? 100,
            'is_primary' => $this->is_primary ?? false,
            'is_active' => $this->is_active ?? true,
        ]);
    }
}
