<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Holiday;
use App\Models\HolidayDefinition;
use Carbon\Carbon;

/**
 * Generates Holiday instances from annual HolidayDefinitions for a given year.
 *
 * Strategy: lazy + persisted
 * - fixed       → exact calendar date (month/day)
 * - nth_weekday → Nth occurrence of a weekday in a month (1=Mon…7=Sun, ISO)
 * - floating    → skip, emit a warning (e.g. Semana Santa)
 * - none        → skip (one-time, never auto-generated)
 *
 * Manual overrides (is_auto_generated=false) are never overwritten.
 */
class HolidayGeneratorService
{
    public function generateForYear(int $year): GenerationResult
    {
        $generated = 0;
        $skipped = 0;
        $warnings = [];

        $definitions = HolidayDefinition::annual()->get();

        foreach ($definitions as $definition) {
            if ($definition->recurrence_type === 'floating') {
                $warnings[] = "{$definition->name} does not have a fixed date for {$year}";
                $skipped++;

                continue;
            }

            if ($definition->recurrence_type === 'none') {
                $skipped++;

                continue;
            }

            $date = $this->resolveDate($definition, $year);

            if ($date === null) {
                $skipped++;

                continue;
            }

            $dateString = $date->toDateString();

            // Check for existing manual override — never overwrite
            $existing = Holiday::where('date', $dateString)->first();

            if ($existing !== null && ! $existing->is_auto_generated) {
                $skipped++;

                continue;
            }

            if ($existing !== null && $existing->is_auto_generated) {
                // Update auto-generated instance (name may have changed)
                $existing->update([
                    'name' => $definition->name,
                    'type' => $definition->type,
                    'pay_multiplier' => $definition->getEffectivePayMultiplier(),
                    'definition_id' => $definition->id,
                ]);
                $generated++;

                continue;
            }

            // No existing instance — create new auto-generated one
            Holiday::create([
                'definition_id' => $definition->id,
                'date' => $dateString,
                'name' => $definition->name,
                'type' => $definition->type,
                'is_auto_generated' => true,
                'pay_multiplier' => $definition->getEffectivePayMultiplier(),
            ]);

            $generated++;
        }

        return new GenerationResult($generated, $skipped, $warnings);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private function resolveDate(HolidayDefinition $definition, int $year): ?Carbon
    {
        $config = $definition->recurrence_config ?? [];

        return match ($definition->recurrence_type) {
            'fixed' => $this->resolveFixed($year, $config),
            'nth_weekday' => $this->resolveNthWeekday($year, $config),
            default => null,
        };
    }

    private function resolveFixed(int $year, array $config): ?Carbon
    {
        if (! isset($config['month'], $config['day'])) {
            return null;
        }

        return Carbon::createFromDate($year, (int) $config['month'], (int) $config['day']);
    }

    /**
     * Calculate the Nth occurrence of a weekday in a given month.
     *
     * @param  array{month: int, week: int, weekday: int}  $config
     *                                                              weekday: 1=Monday … 7=Sunday (ISO 8601)
     */
    private function resolveNthWeekday(int $year, array $config): ?Carbon
    {
        if (! isset($config['month'], $config['week'], $config['weekday'])) {
            return null;
        }

        $month = (int) $config['month'];
        $week = (int) $config['week'];
        $isoWeekday = (int) $config['weekday']; // 1=Mon … 7=Sun

        return $this->calcNthWeekday($year, $month, $week, $isoWeekday);
    }

    /**
     * Returns the date of the Nth occurrence of a weekday in a month.
     *
     * Algorithm:
     *  1. Start at the first day of the month.
     *  2. Advance to the first matching weekday.
     *  3. Add (week - 1) * 7 days to reach the Nth occurrence.
     *
     * @param  int  $weekday  ISO weekday (1=Monday … 7=Sunday)
     */
    private function calcNthWeekday(int $year, int $month, int $week, int $weekday): Carbon
    {
        $firstOfMonth = Carbon::createFromDate($year, $month, 1);

        // Carbon uses ISO weekday: 1=Mon … 7=Sun (isoWeekday())
        $currentWeekday = (int) $firstOfMonth->isoWeekday();

        $daysToAdd = ($weekday - $currentWeekday + 7) % 7;

        $firstOccurrence = $firstOfMonth->copy()->addDays($daysToAdd);

        return $firstOccurrence->addDays(($week - 1) * 7);
    }
}
