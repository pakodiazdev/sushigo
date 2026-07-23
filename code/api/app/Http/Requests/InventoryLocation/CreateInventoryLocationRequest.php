<?php

namespace App\Http\Requests\InventoryLocation;

use App\Http\Requests\InventoryLocation\Concerns\SharesInventoryLocationRules;
use Illuminate\Foundation\Http\FormRequest;

/**
 * @OA\Schema(
 *   schema="CreateInventoryLocationRequest",
 *   required={"operating_unit_id", "name", "type"},
 *
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
    use SharesInventoryLocationRules;

    public function authorize(): bool
    {
        return $this->user()->can('inventory_locations.manage');
    }

    public function rules(): array
    {
        return [
            'operating_unit_id' => ['required', 'integer', 'exists:operating_units,id'],
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'string', 'in:MAIN,DISPLAY,KITCHEN,BAR,TEMP,RETURN,WASTE'],
            ...$this->sharedLocationFieldRules(),
        ];
    }

    protected function prepareForValidation(): void
    {
        $defaults = [];

        if (! $this->has('priority')) {
            $defaults['priority'] = 100;
        }

        if (! $this->has('is_primary')) {
            $defaults['is_primary'] = false;
        }

        if (! $this->has('is_active')) {
            $defaults['is_active'] = true;
        }

        if (! empty($defaults)) {
            $this->merge($defaults);
        }
    }
}
