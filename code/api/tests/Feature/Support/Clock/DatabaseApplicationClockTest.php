<?php

namespace Tests\Feature\Support\Clock;

use App\Enums\ClockMode;
use App\Models\ApplicationClockState;
use App\Support\Clock\DatabaseApplicationClock;
use Carbon\Carbon;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DatabaseApplicationClockTest extends TestCase
{
    use RefreshDatabase;

    private DatabaseApplicationClock $clock;

    protected function setUp(): void
    {
        parent::setUp();
        $this->clock = new DatabaseApplicationClock;
        Carbon::setTestNow(null); // Clear any test time
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow(null);
        parent::tearDown();
    }

    public function test_returns_system_time_when_mode_is_system(): void
    {
        ApplicationClockState::query()->truncate();
        ApplicationClockState::create([
            'mode' => ClockMode::SYSTEM,
            'timezone' => 'America/Mexico_City',
        ]);

        $this->clock->clearCache();
        $now = $this->clock->nowUtc();

        // Should be within 2 seconds of actual system time
        $this->assertLessThanOrEqual(2, abs($now->diffInSeconds(CarbonImmutable::now('UTC'))));
    }

    public function test_returns_simulated_time_when_mode_is_simulated(): void
    {
        $baseTime = CarbonImmutable::parse('2026-01-15 10:00:00', 'UTC');
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

        // Simulated time should be close to base time (within 2 seconds of elapsed)
        $this->assertLessThanOrEqual(2, abs($now->diffInSeconds($baseTime)));
    }

    public function test_simulated_time_advances_with_real_time(): void
    {
        // Set simulation started 60 seconds ago
        $baseTime = CarbonImmutable::parse('2026-01-15 10:00:00', 'UTC');
        $startedAt = CarbonImmutable::now('UTC')->subSeconds(60);

        ApplicationClockState::query()->truncate();
        ApplicationClockState::create([
            'mode' => ClockMode::SIMULATED,
            'base_datetime_utc' => $baseTime,
            'started_real_datetime_utc' => $startedAt,
            'timezone' => 'America/Mexico_City',
        ]);

        $this->clock->clearCache();
        $now = $this->clock->nowUtc();

        // Should be base + ~60 seconds elapsed
        $expectedTime = $baseTime->addSeconds(60);
        $this->assertLessThanOrEqual(2, abs($now->diffInSeconds($expectedTime)));
    }

    public function test_carbon_test_now_takes_precedence_over_simulated(): void
    {
        $testTime = CarbonImmutable::parse('2025-06-01 14:30:00', 'UTC');
        Carbon::setTestNow($testTime);

        // Set up simulated mode
        ApplicationClockState::query()->truncate();
        ApplicationClockState::create([
            'mode' => ClockMode::SIMULATED,
            'base_datetime_utc' => CarbonImmutable::parse('2026-01-15 10:00:00', 'UTC'),
            'started_real_datetime_utc' => CarbonImmutable::now('UTC'),
            'timezone' => 'America/Mexico_City',
        ]);

        $this->clock->clearCache();
        $now = $this->clock->nowUtc();

        // Should use Carbon test time, not simulated time
        $this->assertEquals($testTime->toDateTimeString(), $now->toDateTimeString());
    }

    public function test_mode_returns_system_when_carbon_test_now_is_set(): void
    {
        Carbon::setTestNow(CarbonImmutable::parse('2025-06-01 14:30:00', 'UTC'));

        ApplicationClockState::query()->truncate();
        ApplicationClockState::create([
            'mode' => ClockMode::SIMULATED,
            'base_datetime_utc' => CarbonImmutable::now('UTC'),
            'started_real_datetime_utc' => CarbonImmutable::now('UTC'),
            'timezone' => 'America/Mexico_City',
        ]);

        $this->clock->clearCache();

        // When test time is set, mode reports SYSTEM (test uses its own mechanism)
        $this->assertEquals(ClockMode::SYSTEM, $this->clock->mode());
    }

    public function test_mode_returns_actual_mode_when_no_test_time(): void
    {
        ApplicationClockState::query()->truncate();
        ApplicationClockState::create([
            'mode' => ClockMode::SIMULATED,
            'base_datetime_utc' => CarbonImmutable::now('UTC'),
            'started_real_datetime_utc' => CarbonImmutable::now('UTC'),
            'timezone' => 'America/Mexico_City',
        ]);

        $this->clock->clearCache();

        $this->assertEquals(ClockMode::SIMULATED, $this->clock->mode());
    }

    public function test_today_in_business_tz_returns_correct_date(): void
    {
        // Set a known UTC time where it's still "yesterday" in Mexico
        $utcTime = CarbonImmutable::parse('2026-04-16 04:00:00', 'UTC');
        Carbon::setTestNow($utcTime);

        ApplicationClockState::query()->truncate();
        ApplicationClockState::create([
            'mode' => ClockMode::SYSTEM,
            'timezone' => 'America/Mexico_City', // UTC-6
        ]);

        $this->clock->clearCache();
        $today = $this->clock->todayInBusinessTz();

        // 04:00 UTC = 22:00 -06:00 (previous day)
        $this->assertEquals('2026-04-15', $today);
    }

    public function test_now_in_business_tz_returns_correct_timezone(): void
    {
        $utcTime = CarbonImmutable::parse('2026-04-16 18:00:00', 'UTC');
        Carbon::setTestNow($utcTime);

        ApplicationClockState::query()->truncate();
        ApplicationClockState::create([
            'mode' => ClockMode::SYSTEM,
            'timezone' => 'America/Mexico_City',
        ]);

        $this->clock->clearCache();
        $nowBusiness = $this->clock->nowInBusinessTz();

        $this->assertEquals('America/Mexico_City', $nowBusiness->timezone->getName());
        $this->assertEquals(12, $nowBusiness->hour); // 18:00 UTC = 12:00 Mexico
    }

    public function test_business_timezone_uses_state_timezone(): void
    {
        ApplicationClockState::query()->truncate();
        ApplicationClockState::create([
            'mode' => ClockMode::SYSTEM,
            'timezone' => 'America/New_York',
        ]);

        $this->clock->clearCache();

        $this->assertEquals('America/New_York', $this->clock->businessTimezone());
    }

    public function test_business_timezone_falls_back_to_config(): void
    {
        // When state is created via firstOrCreate without explicit timezone,
        // it should use the config default
        ApplicationClockState::query()->truncate();

        $this->clock->clearCache();

        // firstOrCreate will use the default timezone from config
        $this->assertEquals(
            config('app.business_timezone', 'America/Mexico_City'),
            $this->clock->businessTimezone()
        );
    }

    public function test_clear_cache_reloads_state(): void
    {
        ApplicationClockState::query()->truncate();
        ApplicationClockState::create([
            'mode' => ClockMode::SYSTEM,
            'timezone' => 'America/Mexico_City',
        ]);

        $this->clock->clearCache();
        $this->assertEquals(ClockMode::SYSTEM, $this->clock->mode());

        // Update state directly in DB
        ApplicationClockState::first()->update(['mode' => ClockMode::SIMULATED]);

        // Without clear, should still be cached as SYSTEM
        // We need Carbon test now cleared to check actual mode
        Carbon::setTestNow(null);

        // With clear, should reflect new mode
        $this->clock->clearCache();
        $this->assertEquals(ClockMode::SIMULATED, $this->clock->mode());
    }

    public function test_current_creates_default_state_if_missing(): void
    {
        ApplicationClockState::query()->truncate();

        $this->clock->clearCache();
        $mode = $this->clock->mode();

        $this->assertEquals(ClockMode::SYSTEM, $mode);
        $this->assertDatabaseCount('application_clock_state', 1);
    }
}
