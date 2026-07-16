<?php

namespace Database\Seeders\Development;

use App\Actions\Payroll\ClosePayPeriodForEmployeeAction;
use App\Models\Branch;
use App\Models\Employee;
use App\Models\Holiday;
use App\Models\PayPeriod;
use App\Models\PunctualityRange;
use App\Models\User;
use App\Support\Clock\ApplicationClock;
use Carbon\Carbon;
use Database\Seeders\Base\OnceSeeder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Backfills a year of weekly (Monday–Sunday) CLOSED pay periods per branch, reusing
 * ConfirmCloseController's own computation (ClosePayPeriodForEmployeeAction) so
 * totals stay consistent with the attendance history AttendanceHistorySeeder
 * already built.
 *
 * Only currently active employees with an active employment period are included —
 * this mirrors ConfirmCloseController's roster query, which always closes against
 * the *current* roster rather than a historical one. attendance_exempt employees
 * (e.g. admin) are skipped so every week doesn't carry a permanent $0 row, and an
 * employee is skipped for weeks before their (active period's) hire date so early
 * history doesn't fill up with empty rows for people who weren't hired yet.
 *
 * Must run after WageSeeder, AttendanceHistorySeeder, HolidaySeeder and
 * PunctualityRangeSeeder/PunctualityBonusGroupSeeder — see DevelopmentSeeder order.
 */
class PayPeriodHistorySeeder extends OnceSeeder
{
    private const WEEKS_OF_HISTORY = 53; // >= 365 days of weekly periods

    private ?int $closedById = null;

    private Collection $punctualityRanges;

    private ClosePayPeriodForEmployeeAction $closePayPeriodForEmployee;

    public function run(): void
    {
        $today = app(ApplicationClock::class)->todayInBusinessTz();
        $lastSeededDate = Carbon::parse($today)->subDay();
        $anchorSunday = $lastSeededDate->isSunday()
            ? $lastSeededDate->copy()
            : $lastSeededDate->copy()->previous(Carbon::SUNDAY);

        $this->closedById = User::whereHas('roles', fn ($q) => $q->where('name', 'admin'))->value('id');
        $this->punctualityRanges = PunctualityRange::orderBy('sort_order')->get();
        $this->closePayPeriodForEmployee = app(ClosePayPeriodForEmployeeAction::class);

        $totalPeriods = 0;

        foreach (Branch::all() as $branch) {
            $totalPeriods += $this->seedBranchHistory($branch, $anchorSunday);
        }

        $this->command->info("✓ PayPeriodHistorySeeder: {$totalPeriods} closed pay periods backfilled");
    }

    private function seedBranchHistory(Branch $branch, Carbon $anchorSunday): int
    {
        $employees = Employee::with('employmentPeriods')
            ->where('is_active', true)
            ->where('attendance_exempt', false)
            ->whereHas('employmentPeriods', fn ($q) => $q->where('branch_id', $branch->id)->where('is_active', true))
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->get();

        if ($employees->isEmpty()) {
            return 0;
        }

        $seeded = 0;

        for ($week = 0; $week < self::WEEKS_OF_HISTORY; $week++) {
            $periodEnd = $anchorSunday->copy()->subWeeks($week);
            $periodStart = $periodEnd->copy()->subDays(6);

            if ($this->periodAlreadySeeded($branch, $periodStart, $periodEnd)) {
                continue;
            }

            $weekEmployees = $employees->filter(function (Employee $employee) use ($branch, $periodEnd) {
                $activePeriod = $employee->employmentPeriods
                    ->where('branch_id', $branch->id)
                    ->where('is_active', true)
                    ->first();

                return $activePeriod && $activePeriod->start_date->lte($periodEnd);
            });

            if ($weekEmployees->isEmpty()) {
                continue;
            }

            $holidays = Holiday::whereBetween('date', [$periodStart->toDateString(), $periodEnd->toDateString()])->get();

            $this->closeWeek($branch, $periodStart, $periodEnd, $weekEmployees, $holidays);

            $seeded++;
        }

        return $seeded;
    }

    private function periodAlreadySeeded(Branch $branch, Carbon $periodStart, Carbon $periodEnd): bool
    {
        return PayPeriod::where('branch_id', $branch->id)
            ->where('period_start', $periodStart->toDateString())
            ->where('period_end', $periodEnd->toDateString())
            ->exists();
    }

    private function closeWeek(Branch $branch, Carbon $periodStart, Carbon $periodEnd, Collection $weekEmployees, Collection $holidays): void
    {
        DB::transaction(function () use ($branch, $periodStart, $periodEnd, $weekEmployees, $holidays) {
            $payPeriod = PayPeriod::create([
                'branch_id' => $branch->id,
                'period_start' => $periodStart->toDateString(),
                'period_end' => $periodEnd->toDateString(),
                'status' => PayPeriod::STATUS_CLOSED,
                'closed_by' => $this->closedById,
                'closed_at' => $periodEnd->copy()->addDay()->setTime(9, 0),
            ]);

            foreach ($weekEmployees as $employee) {
                ($this->closePayPeriodForEmployee)(
                    $employee,
                    $payPeriod,
                    $periodStart->toDateString(),
                    $periodEnd->toDateString(),
                    $holidays,
                    $this->punctualityRanges
                );
            }
        });
    }
}
