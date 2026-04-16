<?php

namespace App\Support\Clock;

use App\Enums\ClockMode;
use Carbon\CarbonImmutable;

/**
 * Contract for Application Clock source of truth.
 *
 * Business logic must read current time via this interface,
 * not directly from now() or Carbon::now().
 */
interface ApplicationClock
{
    /**
     * Get current instant in UTC.
     */
    public function nowUtc(): CarbonImmutable;

    /**
     * Get current instant in business timezone.
     */
    public function nowInBusinessTz(): CarbonImmutable;

    /**
     * Get today's date in business timezone (Y-m-d format).
     */
    public function todayInBusinessTz(): string;

    /**
     * Get current clock mode.
     */
    public function mode(): ClockMode;

    /**
     * Get business timezone identifier.
     */
    public function businessTimezone(): string;
}
