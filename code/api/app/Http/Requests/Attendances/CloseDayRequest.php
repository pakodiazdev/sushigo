<?php

namespace App\Http\Requests\Attendances;

use Illuminate\Foundation\Http\FormRequest;

/**
 * POST /api/v1/attendances/close-day
 *
 * Validates the close-day batch request.
 *
 * @OA\Schema(
 *     schema="CloseDayRequest",
 *     required={"branch_id", "close_time"},
 *
 *     @OA\Property(property="branch_id", type="integer", example=1, description="Branch ID"),
 *     @OA\Property(property="close_time", type="string", example="17:00", description="Close time in HH:mm (local CDMX)"),
 *     @OA\Property(
 *         property="lunch_returns",
 *         type="array",
 *         description="Pending lunch returns to register before closing",
 *
 *         @OA\Items(
 *
 *             @OA\Property(property="attendance_id", type="string", description="Attendance ULID"),
 *             @OA\Property(property="lunch_end", type="string", example="14:05", description="Lunch return time in HH:mm (local CDMX)")
 *         )
 *     )
 * )
 */
class CloseDayRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'branch_id' => ['required', 'integer', 'exists:branches,id'],
            'close_time' => ['required', 'date_format:H:i'],
            'lunch_returns' => ['sometimes', 'array'],
            'lunch_returns.*.attendance_id' => ['required', 'string'],
            'lunch_returns.*.lunch_end' => ['required', 'date_format:H:i'],
        ];
    }
}
