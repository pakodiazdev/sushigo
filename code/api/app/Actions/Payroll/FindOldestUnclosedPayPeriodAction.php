<?php

namespace App\Actions\Payroll;

use App\Support\Clock\ApplicationClock;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Find the oldest Monday–Sunday week for a branch that still needs an initial close.
 *
 * Periods are no longer required to be closed in order — out-of-order closing (via the
 * payroll close page's nav arrows) is deliberate, so the "next" week to target can't just be
 * "the week after whatever period has the latest period_start": closing a newer overdue week
 * first would make an older, still-unclosed week the new latest-period's neighbor and hide it
 * forever, since nothing else in the UI can reach a week that isn't "the oldest unclosed" one.
 *
 * Instead this walks every week from the branch's very first PayPeriod forward and returns the
 * first one with no PayPeriod row at all (any status), which is the true oldest gap.
 */
class FindOldestUnclosedPayPeriodAction
{
    public function __construct(private readonly ApplicationClock $clock) {}

    public function __invoke(int $branchId): array
    {
        $currentWeekStart = Carbon::parse($this->clock->todayInBusinessTz())->startOfWeek(Carbon::MONDAY);

        $earliestStart = DB::table('pay_periods')
            ->where('branch_id', $branchId)
            ->min('period_start');

        if (! $earliestStart) {
            return $this->weekRange($currentWeekStart);
        }

        // The upper bound is always one week beyond the current business week, so it's
        // guaranteed to have no PayPeriod row yet (periods can't be closed ahead of their own
        // Sunday-19:00 gate) — the gap search below is therefore guaranteed to find a row.
        $upperBound = $currentWeekStart->copy()->addDays(7);

        $row = DB::selectOne(
            "SELECT gs::date AS week_start
             FROM generate_series(?::date, ?::date, interval '7 days') AS gs
             LEFT JOIN pay_periods pp
               ON pp.branch_id = ? AND pp.period_start = gs::date
             WHERE pp.id IS NULL
             ORDER BY gs ASC
             LIMIT 1",
            [$earliestStart, $upperBound->toDateString(), $branchId]
        );

        return $this->weekRange(Carbon::parse($row->week_start));
    }

    private function weekRange(Carbon $weekStart): array
    {
        return [
            'period_start' => $weekStart->toDateString(),
            'period_end' => $weekStart->copy()->addDays(6)->toDateString(),
        ];
    }
}
