<?php

namespace App\Actions\Attendances;

use App\Enums\AuditAction;
use App\Enums\OvertimeValuationMethod;
use App\Models\Attendance;
use App\Models\AttendanceAuditLog;
use App\Models\Employee;
use App\Models\User;
use App\Support\Clock\ApplicationClock;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Record the Manager's decision on whether to pay an employee's overtime.
 *
 * Business rules:
 *   1. The attendance must have overtime_minutes > 0; otherwise 422.
 *   2. A decision can only be recorded once.
 *      Enforced atomically: the UPDATE only affects rows where
 *      overtime_authorized_at IS NULL, and a 422 is thrown if no row was updated.
 *   3. authorize = true  → overtime_authorized = true,  records who/when
 *      authorize = false → overtime_authorized = false, records when (no "who" needed)
 *
 * Note: overtime_authorized_at is always set on both authorize and reject so that
 * "no decision yet" (null) can be distinguished from "decision recorded" (not null).
 *
 * LFT_PROPORTIONAL reads other attendances' authorized overtime for the same
 * employee/week (see ResolveOvertimeValuationAction::accumulatedOvertimeHoursThisWeek).
 * Two managers deciding different attendances of the same employee at the same moment
 * could otherwise both resolve against the same stale accumulated hours and both land
 * in a cheaper tier, so that path locks the employee row for the duration of the
 * transaction to serialize concurrent decisions.
 *
 * @see AP-016, AP-018 · RF-47a, RF-47b, RF-48, DC-01
 */
class RecordOvertimeDecisionAction
{
    public function __construct(
        private readonly ApplicationClock $clock,
        private readonly ResolveOvertimeValuationAction $resolveValuation,
    ) {}

    /**
     * @param  Attendance  $attendance  Already-loaded attendance record
     * @param  array{authorize: bool, valuation_method?: string, agreed_rate?: float, agreed_factor?: float, reason?: string}  $data  Validated request data
     * @param  User  $decidedBy  Authenticated user recording the decision
     *
     * @throws ValidationException
     */
    public function __invoke(Attendance $attendance, array $data, User $decidedBy): Attendance
    {
        $this->guardHasOvertime($attendance);

        $authorize = (bool) $data['authorize'];
        $now = $this->clock->nowUtc();

        return DB::transaction(function () use ($attendance, $data, $decidedBy, $authorize, $now) {
            $valuationMethod = null;
            $rateApplied = null;
            $amount = null;

            if ($authorize) {
                $valuationMethod = OvertimeValuationMethod::from($data['valuation_method']);

                if ($valuationMethod === OvertimeValuationMethod::LFT_PROPORTIONAL) {
                    Employee::where('id', $attendance->employee_id)->lockForUpdate()->first();
                }

                $resolved = ($this->resolveValuation)(
                    $attendance,
                    $valuationMethod,
                    isset($data['agreed_rate']) ? (float) $data['agreed_rate'] : null,
                    isset($data['agreed_factor']) ? (float) $data['agreed_factor'] : null,
                );
                $rateApplied = $resolved['rate_applied'];
                $amount = $resolved['amount'];
            }

            // Atomic update: only affects rows where no decision has been recorded yet.
            // If 0 rows are affected, a concurrent request already recorded the decision.
            $affected = Attendance::where('id', $attendance->id)
                ->whereNull('overtime_authorized_at')
                ->update([
                    'overtime_authorized' => $authorize,
                    'overtime_authorized_by' => $authorize ? $decidedBy->id : null,
                    'overtime_authorized_at' => $now,
                    'overtime_valuation_method' => $valuationMethod?->value,
                    'overtime_rate_applied' => $rateApplied,
                    'overtime_amount' => $amount,
                ]);

            if ($affected === 0) {
                throw ValidationException::withMessages([
                    'authorize' => 'Ya se registró una decisión sobre las horas extra de este empleado.',
                ]);
            }

            // The atomic query-builder update bypasses Eloquent model events, so the
            // Auditable trait never fires. We write the audit entry manually to ensure
            // overtime decisions are included in the audit trail (RF-19).
            AttendanceAuditLog::create([
                'auditable_type' => Attendance::class,
                'auditable_id' => $attendance->id,
                'action' => AuditAction::UPDATE,
                'old_values' => [
                    'overtime_authorized' => $attendance->getRawOriginal('overtime_authorized'),
                    'overtime_authorized_by' => $attendance->getRawOriginal('overtime_authorized_by'),
                    'overtime_authorized_at' => $attendance->getRawOriginal('overtime_authorized_at'),
                    'overtime_valuation_method' => $attendance->getRawOriginal('overtime_valuation_method'),
                    'overtime_rate_applied' => $attendance->getRawOriginal('overtime_rate_applied'),
                    'overtime_amount' => $attendance->getRawOriginal('overtime_amount'),
                ],
                'new_values' => [
                    'overtime_authorized' => $authorize,
                    'overtime_authorized_by' => $authorize ? $decidedBy->id : null,
                    'overtime_authorized_at' => $now->toDateTimeString(),
                    'overtime_valuation_method' => $valuationMethod?->value,
                    'overtime_rate_applied' => $rateApplied,
                    'overtime_amount' => $amount,
                ],
                'user_id' => $decidedBy->id,
                'reason' => $data['reason'] ?? null,
            ]);

            return $attendance->fresh(['employee']);
        });
    }

    /**
     * @throws ValidationException
     */
    private function guardHasOvertime(Attendance $attendance): void
    {
        if (($attendance->overtime_minutes ?? 0) === 0) {
            throw ValidationException::withMessages([
                'authorize' => 'Este registro no tiene horas extra que autorizar.',
            ]);
        }
    }
}
