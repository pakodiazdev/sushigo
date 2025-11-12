<?php

namespace App\Http\Requests\InventoryLocation;

use Illuminate\Foundation\Http\FormRequest;

/**
 * @OA\Schema(
 *   schema="CreateInventoryLocationRequest",
 *   required={"operating_unit_id", "name", "type"},
 *   @OA\Property(property="operating_unit_id", type="integer", example=1, description="Operating unit ID"),
 *   @OA\Property(property="code", type="string", maxLength=50, example="MESA-REC-01", description="Unique location code"),
 *   @OA\Property(property="name", type="string", maxLength=255, example="Main Warehouse", description="Location name"),
 *   @OA\Property(property="type", type="string", enum={"MAIN", "DISPLAY", "KITCHEN", "BAR", "TEMP", "RETURN", "WASTE"}, example="MAIN", description="Location type"),
 *   @OA\Property(property="priority", type="integer", example=100, description="Location priority (higher = more important, 0-1000)"),
 *   @OA\Property(property="is_primary", type="boolean", example=false, description="Is primary location for this unit"),
 *   @OA\Property(property="is_active", type="boolean", example=true, description="Is location active"),
 *   @OA\Property(property="is_pickable", type="boolean", example=true, description="Can be used for automatic picking/reservation"),
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
            'code' => ['nullable', 'string', 'max:50'],
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'string', 'in:MAIN,DISPLAY,KITCHEN,BAR,TEMP,RETURN,WASTE'],
            'priority' => ['nullable', 'integer', 'min:0', 'max:1000'],
            'is_primary' => ['nullable', 'boolean'],
            'is_active' => ['nullable', 'boolean'],
            'is_pickable' => ['nullable', 'boolean'],
            'notes' => ['nullable', 'string'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $type = $this->input('type');
        
        $this->merge([
            'priority' => $this->priority ?? \App\Models\InventoryLocation::getDefaultPriority($type ?? 'MAIN'),
            'is_primary' => $this->is_primary ?? false,
            'is_active' => $this->is_active ?? true,
            'is_pickable' => $this->is_pickable ?? \App\Models\InventoryLocation::getDefaultPickable($type ?? 'MAIN'),
        ]);
    }
}
