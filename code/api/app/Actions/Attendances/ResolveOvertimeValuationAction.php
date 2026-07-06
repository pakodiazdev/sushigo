<?php

namespace App\Actions\Attendances;

use App\Enums\OvertimeValuationMethod;
use App\Models\Attendance;
use App\Models\OvertimeLftTier;
use App\Models\WageHistory;
use Carbon\Carbon;
use Illuminate\Validation\ValidationException;

/**
 * Resolve the rate/factor applied and the resulting amount for a given
 * overtime valuation method, without persisting anything.
 *
 * Shared by RecordOvertimeDecisionAction (persists the result) and
 * PreviewOvertimeValuationController (read-only preview for the UI).
 *
 * LFT_PROPORTIONAL: the tier is resolved from hours already authorized this
 *   week (before this decision) — the whole decision is valued under that tier.
 * AGREED_RATE: a flat hourly rate negotiated for this specific case.
 * SALARY_FACTOR: a custom multiplier of the employee's own minute rate,
 *   negotiated for this specific case (e.g. 1.5x instead of the LFT tier).
 */
class ResolveOvertimeValuationAction
{
    /**
     * @return array{rate_applied: float, amount: float, accumulated_hours: ?float}
     *
     * @throws ValidationException
     */
    public function __invoke(
        Attendance $attendance,
        OvertimeValuationMethod $method,
        ?float $agreedRate = null,
        ?float $agreedFactor = null,
    ): array {
        $minutes = (int) $attendance->overtime_minutes;

        if ($method === OvertimeValuationMethod::AGREED_RATE) {
            $rate = (float) $agreedRate;

            return [
                'rate_applied' => $rate,
                'amount' => round(($rate / 60) * $minutes, 2),
                'accumulated_hours' => null,
            ];
        }

        $minuteRate = $this->minuteRateFor((int) $attendance->employee_id, $attendance->date);

        if ($method === OvertimeValuationMethod::SALARY_FACTOR) {
            $factor = (float) $agreedFactor;

            return [
                'rate_applied' => $factor,
                'amount' => round($minuteRate * $factor * $minutes, 2),
                'accumulated_hours' => null,
            ];
        }

        $accumulatedHours = $this->accumulatedOvertimeHoursThisWeek($attendance);

        $tier = OvertimeLftTier::orderBy('sort_order')->get()
            ->first(fn (OvertimeLftTier $t) => $t->matches($accumulatedHours));

        if (! $tier) {
            throw ValidationException::withMessages([
                'valuation_method' => 'No hay un tramo LFT configurado para las horas acumuladas de este empleado.',
            ]);
        }

        $factor = (float) $tier->factor;

        return [
            'rate_applied' => $factor,
            'amount' => round($minuteRate * $factor * $minutes, 2),
            'accumulated_hours' => $accumulatedHours,
        ];
    }

    private function minuteRateFor(int $employeeId, $date): float
    {
        $wage = WageHistory::where('employee_id', $employeeId)
            ->effective($date)
            ->orderByDesc('effective_from')
            ->first();

        return $wage ? $wage->minuteRate() : 0.0;
    }

    /**
     * Sum of overtime minutes already authorized for this employee in the
     * Monday–Sunday week containing this attendance's date, excluding this
     * attendance itself (its decision hasn't been recorded yet).
     */
    private function accumulatedOvertimeHoursThisWeek(Attendance $attendance): float
    {
        $weekStart = Carbon::parse($attendance->date)->startOfWeek(Carbon::MONDAY);
        $weekEnd = Carbon::parse($attendance->date)->endOfWeek(Carbon::SUNDAY);

        $minutes = Attendance::where('employee_id', $attendance->employee_id)
            ->whereBetween('date', [$weekStart->toDateString(), $weekEnd->toDateString()])
            ->where('id', '!=', $attendance->id)
            ->where('overtime_authorized', true)
            ->sum('overtime_minutes');

        return $minutes / 60;
    }
}
