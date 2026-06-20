<?php

declare(strict_types=1);

namespace Tests\Unit\Services;

use App\Models\Holiday;
use App\Models\HolidayDefinition;
use App\Services\HolidayGeneratorService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class HolidayGeneratorServiceTest extends TestCase
{
    use RefreshDatabase;

    private HolidayGeneratorService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new HolidayGeneratorService;
    }

    // ── Fixed recurrence ──────────────────────────────────────────────────────

    #[Test]
    public function fixed_recurrence_generates_correct_date(): void
    {
        HolidayDefinition::factory()->obligatorio()->create([
            'name' => 'Independence Day',
            'recurrence_type' => 'fixed',
            'recurrence_config' => ['month' => 9, 'day' => 16],
            'is_annual' => true,
        ]);

        $result = $this->service->generateForYear(2026);

        $this->assertSame(1, $result->generated);
        $this->assertDatabaseHas('holidays', ['date' => '2026-09-16', 'name' => 'Independence Day']);
    }

    // ── Nth weekday recurrence ────────────────────────────────────────────────

    #[Test]
    public function nth_weekday_calculates_first_monday_of_february(): void
    {
        // 2026-02-02 is the first Monday of February 2026
        HolidayDefinition::factory()->obligatorio()->create([
            'name' => 'Constitution Day',
            'recurrence_type' => 'nth_weekday',
            'recurrence_config' => ['month' => 2, 'week' => 1, 'weekday' => 1],
            'is_annual' => true,
        ]);

        $result = $this->service->generateForYear(2026);

        $this->assertSame(1, $result->generated);
        $this->assertDatabaseHas('holidays', ['date' => '2026-02-02', 'name' => 'Constitution Day']);
    }

    #[Test]
    public function nth_weekday_calculates_third_monday_of_november(): void
    {
        // 2026-11-16 is the third Monday of November 2026
        HolidayDefinition::factory()->obligatorio()->create([
            'name' => 'Revolution Day',
            'recurrence_type' => 'nth_weekday',
            'recurrence_config' => ['month' => 11, 'week' => 3, 'weekday' => 1],
            'is_annual' => true,
        ]);

        $result = $this->service->generateForYear(2026);

        $this->assertSame(1, $result->generated);
        $this->assertDatabaseHas('holidays', ['date' => '2026-11-16', 'name' => 'Revolution Day']);
    }

    // ── Floating recurrence ───────────────────────────────────────────────────

    #[Test]
    public function floating_generates_warning_and_no_holiday_instance(): void
    {
        HolidayDefinition::factory()->asueto()->create([
            'name' => 'Good Friday',
            'recurrence_type' => 'floating',
            'recurrence_config' => [],
            'is_annual' => true,
        ]);

        $result = $this->service->generateForYear(2026);

        $this->assertSame(0, $result->generated);
        $this->assertSame(1, $result->skipped);
        $this->assertCount(1, $result->warnings);
        $this->assertStringContainsString('Good Friday', $result->warnings[0]);
        $this->assertStringContainsString('2026', $result->warnings[0]);
        $this->assertDatabaseCount('holidays', 0);
    }

    // ── Idempotency ───────────────────────────────────────────────────────────

    #[Test]
    public function does_not_duplicate_when_auto_generated_instance_already_exists(): void
    {
        $definition = HolidayDefinition::factory()->obligatorio()->create([
            'name' => 'New Year',
            'recurrence_type' => 'fixed',
            'recurrence_config' => ['month' => 1, 'day' => 1],
            'is_annual' => true,
        ]);

        // First call creates instance
        $this->service->generateForYear(2026);
        $this->assertDatabaseCount('holidays', 1);

        // Second call updates, not duplicates
        $this->service->generateForYear(2026);
        $this->assertDatabaseCount('holidays', 1);
    }

    // ── Manual override protection ────────────────────────────────────────────

    #[Test]
    public function manual_override_is_not_overwritten(): void
    {
        HolidayDefinition::factory()->obligatorio()->create([
            'name' => 'New Year',
            'recurrence_type' => 'fixed',
            'recurrence_config' => ['month' => 1, 'day' => 1],
            'is_annual' => true,
        ]);

        // Create a manual override (is_auto_generated = false)
        Holiday::factory()->create([
            'date' => '2026-01-01',
            'name' => 'Custom New Year Override',
            'is_auto_generated' => false,
        ]);

        $result = $this->service->generateForYear(2026);

        $this->assertSame(0, $result->generated);
        $this->assertSame(1, $result->skipped);

        // Original manual name preserved
        $this->assertDatabaseHas('holidays', [
            'date' => '2026-01-01',
            'name' => 'Custom New Year Override',
            'is_auto_generated' => false,
        ]);
    }
}
