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
    private const ATTR_ATTENDANCE_ID = 'lunch_returns.*.attendance_id';

    private const ATTR_LUNCH_END = 'lunch_returns.*.lunch_end';

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
            self::ATTR_ATTENDANCE_ID => ['required', 'string', 'distinct', 'exists:attendances,public_id'],
            self::ATTR_LUNCH_END => ['required', 'date_format:H:i'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'branch_id.required' => __('validation.required', ['attribute' => 'branch_id']),
            'branch_id.integer' => __('validation.integer', ['attribute' => 'branch_id']),
            'branch_id.exists' => __('validation.exists', ['attribute' => 'branch_id']),

            'close_time.required' => __('validation.required', ['attribute' => 'close_time']),
            'close_time.date_format' => __('validation.date_format', ['attribute' => 'close_time', 'format' => 'H:i']),

            'lunch_returns.array' => __('validation.array', ['attribute' => 'lunch_returns']),

            self::ATTR_ATTENDANCE_ID.'.required' => __('validation.required', ['attribute' => self::ATTR_ATTENDANCE_ID]),
            self::ATTR_ATTENDANCE_ID.'.string' => __('validation.string', ['attribute' => self::ATTR_ATTENDANCE_ID]),
            self::ATTR_ATTENDANCE_ID.'.distinct' => __('validation.distinct', ['attribute' => self::ATTR_ATTENDANCE_ID]),
            self::ATTR_ATTENDANCE_ID.'.exists' => __('validation.exists', ['attribute' => self::ATTR_ATTENDANCE_ID]),

            self::ATTR_LUNCH_END.'.required' => __('validation.required', ['attribute' => self::ATTR_LUNCH_END]),
            self::ATTR_LUNCH_END.'.date_format' => __('validation.date_format', ['attribute' => self::ATTR_LUNCH_END, 'format' => 'H:i']),
        ];
    }
}
