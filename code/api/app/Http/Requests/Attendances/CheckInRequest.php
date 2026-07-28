<?php

namespace App\Http\Requests\Attendances;

use App\Http\Requests\Concerns\GuardsClosedPayPeriod;
use App\Models\Attendance;
use App\Support\Clock\ApplicationClock;
use Carbon\Carbon;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;
use Throwable;

/**
 * @OA\Schema(
 *   schema="CheckInRequest",
 *   required={"employee_id", "check_in"},
 *
 *   @OA\Property(
 *       property="employee_id",
 *       type="string",
 *       example="01JKXYZ1234567890ABCDEFGH",
 *       description="Employee public_id (ULID)"
 *   ),
 *   @OA\Property(
 *       property="check_in",
 *       type="string",
 *       format="date-time",
 *       example="2026-02-23T09:05:30-06:00",
 *       description="Check-in datetime in ISO 8601 / RFC 3339 with timezone offset. Normalized to UTC by the server."
 *   ),
 *   @OA\Property(
 *       property="reason",
 *       type="string",
 *       example="Corrección retroactiva autorizada por RH",
 *       description="Required when an Admin registers a check-in for a past date."
 *   )
 * )
 */
class CheckInRequest extends FormRequest
{
    use GuardsClosedPayPeriod;

    public function __construct(private readonly ApplicationClock $clock)
    {
        parent::__construct();
    }

    public function authorize(): bool
    {
        $date = $this->resolveCheckInDate();
        if ($date === null) {
            return true; // missing or unparseable check_in — validation will reject it with 422
        }

        $today = $this->clock->todayInBusinessTz();
        $user = $this->user();
        $isAdmin = $user?->hasRole('admin') || $user?->hasRole('super-admin');

        return ($isAdmin || $date === $today) && ! $this->isCorrectingWithoutPermission($date);
    }

    /**
     * Local date (Y-m-d) parsed from the check_in input, or null when it's
     * missing/unparseable — those cases are left for validation to reject.
     */
    private function resolveCheckInDate(): ?string
    {
        $checkInInput = $this->input('check_in');
        if (! $checkInInput) {
            return null;
        }

        try {
            return Carbon::parse($checkInInput)->toDateString();
        } catch (Throwable) {
            return null;
        }
    }

    /**
     * A check-in that overwrites an already-recorded check_in for this
     * employee/date is a correction of an already-recorded event and
     * requires attendances.update, on top of the date-based rule above.
     * A record with no check_in yet (e.g. a Falta/ABSENCE stub) is not
     * affected — that flow is untouched by this endpoint.
     */
    private function isCorrectingWithoutPermission(string $date): bool
    {
        $employeeId = $this->employeeIdFromPublicId($this->input('employee_id'));
        if (! $employeeId) {
            return false;
        }

        $existingCheckIn = Attendance::where('employee_id', $employeeId)
            ->where('date', $date)
            ->value('check_in');

        if ($existingCheckIn === null) {
            return false;
        }

        return ! $this->user()?->can('attendances.update');
    }

    public function rules(): array
    {
        return [
            'employee_id' => [
                'required',
                'string',
                Rule::exists('employees', 'public_id')->whereNull('deleted_at'),
            ],
            'check_in' => ['required', 'date'],
            'reason' => $this->reasonRules(),
        ];
    }

    public function messages(): array
    {
        return [
            'employee_id.exists' => 'No se encontró el empleado especificado.',
            'check_in.date' => 'El campo check_in debe ser una fecha válida en formato ISO 8601 (ej. 2026-02-23T09:05:30-06:00).',
            'reason.required' => 'Se requiere un motivo para registrar check-in en un día anterior.',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $checkInInput = $this->input('check_in');
        if (! $checkInInput) {
            return;
        }

        try {
            $date = Carbon::parse($checkInInput)->toDateString();
        } catch (Throwable) {
            return;
        }

        $employeeId = $this->employeeIdFromPublicId($this->input('employee_id'));

        $this->guardClosedPeriod($validator, $employeeId, $date, 'check_in');
    }

    private function reasonRules(): array
    {
        $checkInInput = $this->input('check_in');
        if (! $checkInInput) {
            return ['nullable', 'string', 'max:500'];
        }

        $user = $this->user();
        $isAdmin = $user?->hasRole('admin') || $user?->hasRole('super-admin');
        $today = $this->clock->todayInBusinessTz();

        try {
            $date = Carbon::parse($checkInInput)->toDateString();
        } catch (Throwable) {
            return ['nullable', 'string', 'max:500']; // unparseable — validation will reject
        }

        $isPastDay = $date < $today;

        return ($isAdmin && $isPastDay)
            ? ['required', 'string', 'min:5', 'max:500']
            : ['nullable', 'string', 'max:500'];
    }
}
