<?php

namespace Tests\Feature\Devtools;

use App\Enums\ClockMode;
use App\Models\ApplicationClockState;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Tests\TestCase;

class ClockEndpointsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Enable clock simulation for tests
        Config::set('clock.simulation_enabled', true);
        Config::set('clock.allowed_environments', 'testing');

        // Ensure clean clock state
        ApplicationClockState::query()->truncate();
    }

    // ── GET /api/v1/devtools/clock ──────────────────────────────────────

    public function test_get_clock_returns_system_mode_by_default(): void
    {
        $response = $this->getJson('/api/v1/devtools/clock');

        $response->assertOk()
            ->assertJsonStructure([
                'mode',
                'application_now_utc',
                'business_timezone',
                'business_date',
                'business_now',
            ])
            ->assertJsonPath('mode', 'system');
    }

    public function test_get_clock_returns_simulated_mode_when_set(): void
    {
        ApplicationClockState::create([
            'mode' => ClockMode::SIMULATED,
            'base_datetime_utc' => CarbonImmutable::parse('2026-01-15 10:00:00', 'UTC'),
            'started_real_datetime_utc' => CarbonImmutable::now('UTC'),
            'timezone' => 'America/Mexico_City',
        ]);

        $response = $this->getJson('/api/v1/devtools/clock');

        $response->assertOk()
            ->assertJsonPath('mode', 'simulated');
    }

    public function test_get_clock_returns_404_when_simulation_disabled(): void
    {
        Config::set('clock.simulation_enabled', false);

        $response = $this->getJson('/api/v1/devtools/clock');

        $response->assertNotFound();
    }

    public function test_get_clock_returns_404_when_environment_not_allowed(): void
    {
        Config::set('clock.allowed_environments', 'local,devtest');

        $response = $this->getJson('/api/v1/devtools/clock');

        $response->assertNotFound();
    }

    // ── POST /api/v1/devtools/clock/set ─────────────────────────────────

    public function test_set_clock_switches_to_simulated_mode(): void
    {
        $targetDatetime = '2026-06-15T14:30:00-06:00';

        $response = $this->postJson('/api/v1/devtools/clock/set', [
            'datetime' => $targetDatetime,
        ]);

        $response->assertOk()
            ->assertJsonPath('mode', 'simulated');

        $this->assertDatabaseHas('application_clock_state', [
            'mode' => 'simulated',
        ]);
    }

    public function test_set_clock_stores_datetime_in_utc(): void
    {
        // 14:30 -06:00 = 20:30 UTC
        $targetDatetime = '2026-06-15T14:30:00-06:00';

        $this->postJson('/api/v1/devtools/clock/set', [
            'datetime' => $targetDatetime,
        ]);

        $state = ApplicationClockState::first();
        $this->assertEquals(
            '2026-06-15 20:30:00',
            $state->base_datetime_utc->format('Y-m-d H:i:s')
        );
    }

    public function test_set_clock_requires_datetime(): void
    {
        $response = $this->postJson('/api/v1/devtools/clock/set', []);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['datetime']);
    }

    public function test_set_clock_returns_404_when_simulation_disabled(): void
    {
        Config::set('clock.simulation_enabled', false);

        $response = $this->postJson('/api/v1/devtools/clock/set', [
            'datetime' => '2026-06-15T14:30:00Z',
        ]);

        $response->assertNotFound();
    }

    // ── POST /api/v1/devtools/clock/shift ───────────────────────────────

    public function test_shift_clock_adds_minutes(): void
    {
        // Start with system mode
        ApplicationClockState::create([
            'mode' => ClockMode::SYSTEM,
            'timezone' => 'America/Mexico_City',
        ]);

        $beforeShift = CarbonImmutable::now('UTC');

        $response = $this->postJson('/api/v1/devtools/clock/shift', [
            'minutes' => 60,
        ]);

        $response->assertOk()
            ->assertJsonPath('mode', 'simulated')
            ->assertJsonPath('shifted_minutes', 60);

        $state = ApplicationClockState::first();
        $baseTime = CarbonImmutable::parse($state->base_datetime_utc);

        // Base time should be approximately 60 minutes ahead of when we started
        $expectedMin = $beforeShift->addMinutes(59);
        $expectedMax = $beforeShift->addMinutes(61);

        $this->assertTrue(
            $baseTime->greaterThanOrEqualTo($expectedMin) && $baseTime->lessThanOrEqualTo($expectedMax),
            "Base time should be ~60 minutes ahead. Got: {$baseTime}, Expected around: {$beforeShift->addMinutes(60)}"
        );
    }

    public function test_shift_clock_subtracts_negative_minutes(): void
    {
        ApplicationClockState::create([
            'mode' => ClockMode::SYSTEM,
            'timezone' => 'America/Mexico_City',
        ]);

        $beforeShift = CarbonImmutable::now('UTC');

        $response = $this->postJson('/api/v1/devtools/clock/shift', [
            'minutes' => -30,
        ]);

        $response->assertOk()
            ->assertJsonPath('shifted_minutes', -30);

        $state = ApplicationClockState::first();
        $baseTime = CarbonImmutable::parse($state->base_datetime_utc);

        // Base time should be approximately 30 minutes before when we started
        $expectedMin = $beforeShift->subMinutes(31);
        $expectedMax = $beforeShift->subMinutes(29);

        $this->assertTrue(
            $baseTime->greaterThanOrEqualTo($expectedMin) && $baseTime->lessThanOrEqualTo($expectedMax),
            "Base time should be ~30 minutes behind. Got: {$baseTime}"
        );
    }

    public function test_shift_clock_requires_minutes(): void
    {
        $response = $this->postJson('/api/v1/devtools/clock/shift', []);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['minutes']);
    }

    public function test_shift_clock_returns_404_when_simulation_disabled(): void
    {
        Config::set('clock.simulation_enabled', false);

        $response = $this->postJson('/api/v1/devtools/clock/shift', [
            'minutes' => 60,
        ]);

        $response->assertNotFound();
    }

    // ── POST /api/v1/devtools/clock/reset ───────────────────────────────

    public function test_reset_clock_switches_to_system_mode(): void
    {
        // Start in simulated mode
        ApplicationClockState::create([
            'mode' => ClockMode::SIMULATED,
            'base_datetime_utc' => CarbonImmutable::parse('2026-01-15 10:00:00', 'UTC'),
            'started_real_datetime_utc' => CarbonImmutable::now('UTC'),
            'timezone' => 'America/Mexico_City',
        ]);

        $response = $this->postJson('/api/v1/devtools/clock/reset');

        $response->assertOk()
            ->assertJsonPath('mode', 'system');

        $state = ApplicationClockState::first();
        $this->assertEquals(ClockMode::SYSTEM, $state->mode);
        $this->assertNull($state->base_datetime_utc);
        $this->assertNull($state->started_real_datetime_utc);
    }

    public function test_reset_clock_returns_404_when_simulation_disabled(): void
    {
        Config::set('clock.simulation_enabled', false);

        $response = $this->postJson('/api/v1/devtools/clock/reset');

        $response->assertNotFound();
    }

    // ── Security Tests ──────────────────────────────────────────────────

    public function test_throws_error_when_production_in_allowed_environments(): void
    {
        Config::set('clock.simulation_enabled', true);
        Config::set('clock.allowed_environments', 'local,production');

        // Should throw RuntimeException which becomes 500
        $response = $this->getJson('/api/v1/devtools/clock');

        $response->assertServerError();
    }
}
