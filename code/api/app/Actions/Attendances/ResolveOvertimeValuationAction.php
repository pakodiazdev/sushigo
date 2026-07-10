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
 * LFT_PROPORTIONAL: strictly follows Art. 66-68 LFT — minutes are split across
 *   tiers as the employee's weekly accumulated overtime crosses each tier's
 *   hour cap, so a single day's overtime that straddles the 9h/week boundary
 *   is partly paid at 2x and partly at 3x, instead of the whole day falling
 *   under one bucket. `rate_applied` is the resulting weighted-average factor.
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

        return $this->resolveLftProportional($attendance, $minutes, $minuteRate);
    }

    /**
     * Splits this decision's overtime minutes across the configured LFT tiers
     * as the weekly accumulated hours (before this decision) cross each
     * tier's `up_to_hours` cap, pricing every minute at the factor of the
     * tier it actually falls in.
     *
     * @return array{rate_applied: float, amount: float, accumulated_hours: float}
     *
     * @throws ValidationException
     */
    private function resolveLftProportional(Attendance $attendance, int $minutes, float $minuteRate): array
    {
        $accumulatedHours = $this->accumulatedOvertimeHoursThisWeek($attendance);
        $tiers = OvertimeLftTier::orderBy('sort_order')->get();

        $amount = 0.0;
        $remainingMinutes = $minutes;
        $hoursSoFar = $accumulatedHours;

        foreach ($tiers as $tier) {
            if ($remainingMinutes <= 0) {
                break;
            }

            $capHours = $tier->up_to_hours !== null ? (float) $tier->up_to_hours : null;

            if ($capHours !== null && $hoursSoFar >= $capHours) {
                continue;
            }

            $minutesInTier = $capHours !== null
                ? min($remainingMinutes, (int) round(($capHours - $hoursSoFar) * 60))
                : $remainingMinutes;

            if ($minutesInTier <= 0) {
                continue;
            }

            $amount += $minuteRate * (float) $tier->factor * $minutesInTier;
            $remainingMinutes -= $minutesInTier;
            $hoursSoFar += $minutesInTier / 60;
        }

        if ($remainingMinutes > 0) {
            throw ValidationException::withMessages([
                'valuation_method' => 'No hay un tramo LFT configurado para las horas acumuladas de este empleado.',
            ]);
        }

        $amount = round($amount, 2);
        $effectiveFactor = $minutes > 0 && $minuteRate > 0
            ? round($amount / ($minuteRate * $minutes), 2)
            : 0.0;

        return [
            'rate_applied' => $effectiveFactor,
            'amount' => $amount,
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
