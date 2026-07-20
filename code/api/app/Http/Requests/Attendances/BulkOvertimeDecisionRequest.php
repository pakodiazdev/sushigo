<?php

namespace App\Http\Requests\Attendances;

use App\Enums\OvertimeValuationMethod;
use App\Models\Attendance;
use App\Support\Clock\ApplicationClock;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

/**
 * Validate the bulk overtime authorization/rejection payload.
 *
 * Applies the same decision (authorize/reject, method, rate or factor) to every
 * attendance in `attendance_ids`. Authorization is all-or-nothing: the whole
 * batch is denied (403) if the user cannot edit any one of the given attendances,
 * consistent with the single-decision endpoint's `AttendancePolicy::edit`.
 *
 * @OA\Schema(
 *     schema="BulkOvertimeDecisionRequest",
 *     required={"attendance_ids", "authorize"},
 *
 *     @OA\Property(
 *         property="attendance_ids",
 *         type="array",
 *         description="Attendance public_ids (ULIDs) to apply the decision to",
 *
 *         @OA\Items(type="string", example="01JN4Z8RFPQRSTUV0WXYZ12345")
 *     ),
 *
 *     @OA\Property(
 *         property="authorize",
 *         type="boolean",
 *         example=true,
 *         description="true to authorize overtime payment, false to reject it, for every attendance in the batch."
 *     ),
 *     @OA\Property(
 *         property="valuation_method",
 *         type="string",
 *         enum={"LFT_PROPORTIONAL", "AGREED_RATE", "SALARY_FACTOR"},
 *         nullable=true,
 *         example="AGREED_RATE",
 *         description="Required when authorize=true. LFT_PROPORTIONAL resolves its factor independently per employee."
 *     ),
 *     @OA\Property(
 *         property="agreed_rate",
 *         type="number",
 *         format="float",
 *         nullable=true,
 *         example=90.00,
 *         description="Required when valuation_method=AGREED_RATE (flat hourly rate). Ignored otherwise."
 *     ),
 *     @OA\Property(
 *         property="agreed_factor",
 *         type="number",
 *         format="float",
 *         nullable=true,
 *         example=1.5,
 *         description="Required when valuation_method=SALARY_FACTOR (multiplier of each employee's own minute rate). Ignored otherwise."
 *     ),
 *     @OA\Property(
 *         property="reason",
 *         type="string",
 *         example="Autorización retroactiva aprobada por gerencia",
 *         description="Required when an Admin decides overtime for any past-day attendance in the batch. Recorded on every attendance's audit entry."
 *     )
 * )
 */
class BulkOvertimeDecisionRequest extends FormRequest
{
    public function __construct(private readonly ApplicationClock $clock)
    {
        parent::__construct();
    }

    private ?Collection $resolvedAttendances = null;

    public function authorize(): bool
    {
        $ids = $this->input('attendance_ids');

        if (! is_array($ids)) {
            return true; // wrong type — let the 'array' validation rule report it as 422
        }

        $attendances = $this->resolveAttendances();

        if ($attendances->count() !== count($ids)) {
            return true; // some IDs don't exist — let validation report it as 422
        }

        return $attendances->every(fn (Attendance $attendance) => Gate::allows('edit', $attendance));
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'attendance_ids' => ['required', 'array', 'min:1'],
            'attendance_ids.*' => ['required', 'string', 'distinct', 'exists:attendances,public_id'],
            'authorize' => ['required', 'boolean'],
            'valuation_method' => ['nullable', 'required_if:authorize,true', Rule::enum(OvertimeValuationMethod::class)],
            'agreed_rate' => ['nullable', 'required_if:valuation_method,AGREED_RATE', 'numeric', 'gt:0'],
            'agreed_factor' => ['nullable', 'required_if:valuation_method,SALARY_FACTOR', 'numeric', 'gt:0'],
            'reason' => $this->reasonRules(),
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'attendance_ids.required' => 'Debes seleccionar al menos un empleado.',
            'attendance_ids.min' => 'Debes seleccionar al menos un empleado.',
            'attendance_ids.*.distinct' => 'No se puede repetir el mismo empleado en el lote.',
            'attendance_ids.*.exists' => 'Uno de los registros de asistencia no existe.',
            'authorize.required' => 'La decisión sobre horas extra es requerida.',
            'authorize.boolean' => 'La decisión debe ser verdadero o falso.',
            'valuation_method.required_if' => 'El método de valoración es requerido al autorizar el pago.',
            'agreed_rate.required_if' => 'La tarifa pactada es requerida cuando el método es Tarifa Pactada.',
            'agreed_factor.required_if' => 'El factor es requerido cuando el método es Factor sobre Salario.',
            'reason.required' => 'Se requiere un motivo para editar registros de días anteriores.',
        ];
    }

    /**
     * Mirrors AttendanceFormRequest::reasonRules() for a batch: an admin deciding
     * overtime for ANY past-day attendance in the batch must supply a reason,
     * same as the single-decision endpoint. Managers never reach this — past-day
     * attendances are already blocked earlier by AttendancePolicy::edit in authorize().
     *
     * @return array<int, string>
     */
    private function reasonRules(): array
    {
        $user = $this->user();
        $isAdmin = $user?->hasRole('admin') || $user?->hasRole('super-admin');

        if (! $isAdmin) {
            return ['nullable', 'string', 'max:500'];
        }

        $today = $this->clock->todayInBusinessTz();
        $hasPastDayAttendance = $this->resolveAttendances()
            ->contains(fn (Attendance $attendance) => $attendance->date->toDateString() < $today);

        return $hasPastDayAttendance
            ? ['required', 'string', 'min:5', 'max:500']
            : ['nullable', 'string', 'max:500'];
    }

    /**
     * Resolved attendances in the same order as `attendance_ids`, keyed by public_id.
     *
     * @return Collection<int, Attendance>
     */
    public function resolveAttendances(): Collection
    {
        if ($this->resolvedAttendances === null) {
            $ids = $this->input('attendance_ids');
            $ids = is_array($ids) ? $ids : [];

            $byId = Attendance::with('employee')
                ->whereIn('public_id', $ids)
                ->get()
                ->keyBy('public_id');

            $this->resolvedAttendances = collect($ids)
                ->map(fn (string $id) => $byId->get($id))
                ->filter()
                ->values();
        }

        return $this->resolvedAttendances;
    }

    /**
     * @return array{authorize: bool, valuation_method?: string, agreed_rate?: float, agreed_factor?: float, reason?: string}
     */
    public function decisionData(): array
    {
        return collect($this->validated())
            ->except('attendance_ids')
            ->all();
    }
}
