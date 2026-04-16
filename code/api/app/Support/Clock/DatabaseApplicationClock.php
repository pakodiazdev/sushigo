<?php

namespace App\Support\Clock;

use App\Enums\ClockMode;
use App\Models\ApplicationClockState;
use Carbon\Carbon;
use Carbon\CarbonImmutable;

/**
 * Database-backed Application Clock implementation.
 *
 * Precedence:
 * 1. Carbon::getTestNow() (for PHPUnit/Cypress tests via X-Test-Time)
 * 2. Simulated clock from DB (mode=simulated)
 * 3. Real system clock (mode=system)
 */
class DatabaseApplicationClock implements ApplicationClock
{
    private ?ApplicationClockState $cachedState = null;

    public function nowUtc(): CarbonImmutable
    {
        // Priority 1: Test time (for PHPUnit and X-Test-Time middleware)
        $testNow = Carbon::getTestNow();
        if ($testNow !== null) {
            return CarbonImmutable::instance($testNow)->utc();
        }

        // Priority 2/3: Simulated or system clock from DB state
        return $this->calculateNowUtc();
    }

    public function nowInBusinessTz(): CarbonImmutable
    {
        return $this->nowUtc()->setTimezone($this->businessTimezone());
    }

    public function todayInBusinessTz(): string
    {
        return $this->nowInBusinessTz()->toDateString();
    }

    public function mode(): ClockMode
    {
        // If test time is set, report system mode (test uses its own mechanism)
        if (Carbon::getTestNow() !== null) {
            return ClockMode::SYSTEM;
        }

        return $this->getState()->mode;
    }

    public function businessTimezone(): string
    {
        return $this->getState()->timezone
            ?? config('app.business_timezone', 'America/Mexico_City');
    }

    /**
     * Calculate current UTC instant based on clock mode.
     */
    private function calculateNowUtc(): CarbonImmutable
    {
        $state = $this->getState();

        if ($state->mode === ClockMode::SIMULATED
            && $state->base_datetime_utc !== null
            && $state->started_real_datetime_utc !== null
        ) {
            // Simulated: base + elapsed real time since simulation started
            $startedAt = CarbonImmutable::parse($state->started_real_datetime_utc, 'UTC');
            $elapsed = $startedAt->diffInSeconds(CarbonImmutable::now('UTC'), false);

            return CarbonImmutable::parse($state->base_datetime_utc, 'UTC')
                ->addSeconds($elapsed);
        }

        // System mode: real system clock
        return CarbonImmutable::now('UTC');
    }

    /**
     * Get cached clock state (avoids repeated DB queries within same request).
     */
    private function getState(): ApplicationClockState
    {
        if ($this->cachedState === null) {
            $this->cachedState = ApplicationClockState::current();
        }

        return $this->cachedState;
    }

    /**
     * Clear cached state (useful after state changes).
     */
    public function clearCache(): void
    {
        $this->cachedState = null;
    }
}
