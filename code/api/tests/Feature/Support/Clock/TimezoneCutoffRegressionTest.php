<?php

namespace Tests\Feature\Support\Clock;

use App\Enums\ClockMode;
use App\Models\ApplicationClockState;
use App\Support\Clock\DatabaseApplicationClock;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Regression tests for timezone-sensitive cutoffs and day boundaries.
 *
 * These tests validate that the Application Clock correctly handles
 * edge cases around midnight and timezone transitions.
 *
 * @see doc/conventions/backend/application-clock.md
 */
class TimezoneCutoffRegressionTest extends TestCase
{
    use RefreshDatabase;

    private DatabaseApplicationClock $clock;

    protected function setUp(): void
    {
        parent::setUp();
        $this->clock = new DatabaseApplicationClock;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Day Boundary Tests
    // ═══════════════════════════════════════════════════════════════════════════

    public function test_today_in_business_tz_returns_correct_date_before_midnight(): void
    {
        // 11:30 PM in CDMX (UTC-6) = 05:30 AM next day UTC
        $baseTime = CarbonImmutable::parse('2026-04-16 05:30:00', 'UTC');
        $startedAt = CarbonImmutable::now('UTC');

        ApplicationClockState::query()->truncate();
        ApplicationClockState::create([
            'mode' => ClockMode::SIMULATED,
            'base_datetime_utc' => $baseTime,
            'started_real_datetime_utc' => $startedAt,
            'timezone' => 'America/Mexico_City',
        ]);

        $this->clock->clearCache();
        $today = $this->clock->todayInBusinessTz();

        // Should be April 15 in CDMX (the previous day in UTC)
        $this->assertEquals('2026-04-15', $today);
    }

    public function test_today_in_business_tz_returns_correct_date_after_midnight(): void
    {
        // 12:30 AM in CDMX (UTC-6) = 06:30 AM same day UTC
        $baseTime = CarbonImmutable::parse('2026-04-16 06:30:00', 'UTC');
        $startedAt = CarbonImmutable::now('UTC');

        ApplicationClockState::query()->truncate();
        ApplicationClockState::create([
            'mode' => ClockMode::SIMULATED,
            'base_datetime_utc' => $baseTime,
            'started_real_datetime_utc' => $startedAt,
            'timezone' => 'America/Mexico_City',
        ]);

        $this->clock->clearCache();
        $today = $this->clock->todayInBusinessTz();

        // Should be April 16 in CDMX
        $this->assertEquals('2026-04-16', $today);
    }

    public function test_today_in_business_tz_handles_utc_midnight_crossover(): void
    {
        // UTC midnight (00:00) = 6 PM previous day in CDMX
        $baseTime = CarbonImmutable::parse('2026-04-16 00:00:00', 'UTC');
        $startedAt = CarbonImmutable::now('UTC');

        ApplicationClockState::query()->truncate();
        ApplicationClockState::create([
            'mode' => ClockMode::SIMULATED,
            'base_datetime_utc' => $baseTime,
            'started_real_datetime_utc' => $startedAt,
            'timezone' => 'America/Mexico_City',
        ]);

        $this->clock->clearCache();
        $today = $this->clock->todayInBusinessTz();

        // Should be April 15 in CDMX (6 hours behind UTC)
        $this->assertEquals('2026-04-15', $today);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Cross-timezone Tests
    // ═══════════════════════════════════════════════════════════════════════════

    public function test_today_in_different_timezones_at_same_utc_instant(): void
    {
        // 3 AM UTC on April 16
        $baseTime = CarbonImmutable::parse('2026-04-16 03:00:00', 'UTC');
        $startedAt = CarbonImmutable::now('UTC');

        // Test CDMX (UTC-6): 3 AM UTC = 9 PM April 15 in CDMX
        ApplicationClockState::query()->truncate();
        ApplicationClockState::create([
            'mode' => ClockMode::SIMULATED,
            'base_datetime_utc' => $baseTime,
            'started_real_datetime_utc' => $startedAt,
            'timezone' => 'America/Mexico_City',
        ]);

        $this->clock->clearCache();
        $todayCdmx = $this->clock->todayInBusinessTz();
        $this->assertEquals('2026-04-15', $todayCdmx);

        // Test Tokyo (UTC+9): 3 AM UTC = 12 PM April 16 in Tokyo
        ApplicationClockState::query()->truncate();
        ApplicationClockState::create([
            'mode' => ClockMode::SIMULATED,
            'base_datetime_utc' => $baseTime,
            'started_real_datetime_utc' => $startedAt,
            'timezone' => 'Asia/Tokyo',
        ]);

        $this->clock->clearCache();
        $todayTokyo = $this->clock->todayInBusinessTz();
        $this->assertEquals('2026-04-16', $todayTokyo);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Business Hour Edge Cases
    // ═══════════════════════════════════════════════════════════════════════════

    public function test_business_now_preserves_timezone_context(): void
    {
        $baseTime = CarbonImmutable::parse('2026-04-16 15:30:00', 'UTC');
        $startedAt = CarbonImmutable::now('UTC');

        ApplicationClockState::query()->truncate();
        ApplicationClockState::create([
            'mode' => ClockMode::SIMULATED,
            'base_datetime_utc' => $baseTime,
            'started_real_datetime_utc' => $startedAt,
            'timezone' => 'America/Mexico_City',
        ]);

        $this->clock->clearCache();
        $now = $this->clock->nowUtc();
        $today = $this->clock->todayInBusinessTz();

        // 15:30 UTC = 09:30 CDMX
        $this->assertEquals('09', $now->setTimezone('America/Mexico_City')->format('H'));
        $this->assertEquals('2026-04-16', $today);
    }

    public function test_end_of_business_day_boundary(): void
    {
        // 11:59 PM in CDMX = 05:59 AM next day UTC
        $baseTime = CarbonImmutable::parse('2026-04-17 05:59:00', 'UTC');
        $startedAt = CarbonImmutable::now('UTC');

        ApplicationClockState::query()->truncate();
        ApplicationClockState::create([
            'mode' => ClockMode::SIMULATED,
            'base_datetime_utc' => $baseTime,
            'started_real_datetime_utc' => $startedAt,
            'timezone' => 'America/Mexico_City',
        ]);

        $this->clock->clearCache();
        $today = $this->clock->todayInBusinessTz();

        // Should still be April 16 in CDMX (23:59)
        $this->assertEquals('2026-04-16', $today);
    }

    public function test_start_of_business_day_boundary(): void
    {
        // 12:01 AM in CDMX = 06:01 AM same day UTC
        $baseTime = CarbonImmutable::parse('2026-04-16 06:01:00', 'UTC');
        $startedAt = CarbonImmutable::now('UTC');

        ApplicationClockState::query()->truncate();
        ApplicationClockState::create([
            'mode' => ClockMode::SIMULATED,
            'base_datetime_utc' => $baseTime,
            'started_real_datetime_utc' => $startedAt,
            'timezone' => 'America/Mexico_City',
        ]);

        $this->clock->clearCache();
        $today = $this->clock->todayInBusinessTz();

        // Should be April 16 in CDMX (00:01)
        $this->assertEquals('2026-04-16', $today);
    }
}
