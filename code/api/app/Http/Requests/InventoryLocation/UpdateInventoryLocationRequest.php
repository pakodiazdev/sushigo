<?php

namespace App\Http\Requests\InventoryLocation;

use Illuminate\Foundation\Http\FormRequest;

/**
 * @OA\Schema(
 *   schema="UpdateInventoryLocationRequest",
 *   @OA\Property(property="name", type="string", maxLength=255, example="Updated Warehouse", description="Location name"),
 *   @OA\Property(property="type", type="string", enum={"MAIN", "TEMP", "KITCHEN", "WASTE", "EVENT"}, example="MAIN", description="Location type"),
 *   @OA\Property(property="priority", type="integer", example=150, description="Location priority"),
 *   @OA\Property(property="is_primary", type="boolean", example=true, description="Is primary location"),
 *   @OA\Property(property="is_active", type="boolean", example=true, description="Is location active"),
 *   @OA\Property(property="notes", type="string", example="Updated notes", description="Additional notes"),
 * )
 */
class UpdateInventoryLocationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // TODO: Implement proper authorization
    }

    public function rules(): array
    {
        return [
            'name' => ['nullable', 'string', 'max:255'],
            'type' => ['nullable', 'string', 'in:MAIN,TEMP,KITCHEN,WASTE,EVENT'],
            'priority' => ['nullable', 'integer'],
            'is_primary' => ['nullable', 'boolean'],
            'is_active' => ['nullable', 'boolean'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
