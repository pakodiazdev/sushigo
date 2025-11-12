<?php

namespace App\Http\Requests\OperatingUnit;

use Illuminate\Foundation\Http\FormRequest;

/**
 * @OA\Schema(
 *   schema="CreateOperatingUnitRequest",
 *   required={"branch_id", "name", "type"},
 *   @OA\Property(property="branch_id", type="integer", example=1),
 *   @OA\Property(property="name", type="string", example="Main Kitchen"),
 *   @OA\Property(property="type", type="string", enum={"BRANCH_MAIN", "BRANCH_BUFFER", "BRANCH_RETURN", "EVENT_TEMP"}, example="BRANCH_MAIN"),
 *   @OA\Property(property="start_date", type="string", format="date", example="2025-01-01"),
 *   @OA\Property(property="end_date", type="string", format="date", nullable=true, example="2025-12-31"),
 *   @OA\Property(property="is_active", type="boolean", example=true),
 *   @OA\Property(property="meta", type="object", nullable=true)
 * )
 */
class CreateOperatingUnitRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'branch_id' => 'required|exists:branches,id',
            'name' => 'required|string|max:255',
            'type' => 'required|string|in:BRANCH_MAIN,BRANCH_BUFFER,BRANCH_RETURN,EVENT_TEMP',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'is_active' => 'boolean',
            'meta' => 'nullable|array',
        ];
    }
}
