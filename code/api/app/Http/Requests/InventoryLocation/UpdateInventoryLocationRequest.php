<?php

namespace App\Http\Requests\InventoryLocation;

use App\Http\Requests\InventoryLocation\Concerns\SharesInventoryLocationRules;
use Illuminate\Foundation\Http\FormRequest;

/**
 * @OA\Schema(
 *   schema="UpdateInventoryLocationRequest",
 *
 *   @OA\Property(property="code", type="string", maxLength=50, example="MESA-REC-01", description="Unique location code"),
 *   @OA\Property(property="name", type="string", maxLength=255, example="Updated Warehouse", description="Location name"),
 *   @OA\Property(property="type", type="string", enum={"MAIN", "DISPLAY", "KITCHEN", "BAR", "TEMP", "RETURN", "WASTE"}, example="MAIN", description="Location type"),
 *   @OA\Property(property="priority", type="integer", example=150, description="Location priority (0-1000)"),
 *   @OA\Property(property="is_primary", type="boolean", example=true, description="Is primary location"),
 *   @OA\Property(property="is_active", type="boolean", example=true, description="Is location active"),
 *   @OA\Property(property="is_pickable", type="boolean", example=true, description="Can be used for picking"),
 *   @OA\Property(property="can_receive_purchases", type="boolean", example=true, description="Whether supplier purchases may be received into this location (#568)"),
 *   @OA\Property(property="notes", type="string", example="Updated notes", description="Additional notes"),
 * )
 */
class UpdateInventoryLocationRequest extends FormRequest
{
    use SharesInventoryLocationRules;

    public function authorize(): bool
    {
        return $this->user()->can('inventory_locations.manage');
    }

    public function rules(): array
    {
        return [
            'name' => ['nullable', 'string', 'max:255'],
            'type' => ['nullable', 'string', 'in:MAIN,DISPLAY,KITCHEN,BAR,TEMP,RETURN,WASTE'],
            ...$this->sharedLocationFieldRules(),
        ];
    }
}
