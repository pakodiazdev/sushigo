<?php

declare(strict_types=1);

namespace Tests\Feature\Holidays;

use App\Models\HolidayDefinition;
use PHPUnit\Framework\Attributes\Test;

class HolidayGenerationTest extends HolidayTestCase
{
    #[Test]
    public function get_holidays_triggers_annual_holiday_generation_for_year(): void
    {
        $this->makeUserWithPermissions(['holidays.manage']);

        HolidayDefinition::factory()->obligatorio()->create([
            'name' => 'Independence Day',
            'recurrence_type' => 'fixed',
            'recurrence_config' => ['month' => 9, 'day' => 16],
            'is_annual' => true,
        ]);

        $this->getJson('/api/v1/holidays?year=2026')
            ->assertStatus(200)
            ->assertJsonPath('data.0.name', 'Independence Day')
            ->assertJsonPath('data.0.is_auto_generated', true);

        $this->assertDatabaseHas('holidays', [
            'date' => '2026-09-16',
            'name' => 'Independence Day',
            'is_auto_generated' => true,
        ]);
    }

    #[Test]
    public function response_includes_meta_warnings_for_floating_holidays(): void
    {
        $this->makeUserWithPermissions(['holidays.manage']);

        HolidayDefinition::factory()->asueto()->create([
            'name' => 'Good Friday',
            'recurrence_type' => 'floating',
            'recurrence_config' => [],
            'is_annual' => true,
        ]);

        $response = $this->getJson('/api/v1/holidays?year=2026')
            ->assertStatus(200)
            ->assertJsonStructure([
                'meta' => ['warnings'],
            ]);

        $warnings = $response->json('meta.warnings');
        $this->assertIsArray($warnings);
        $this->assertCount(1, $warnings);
        $this->assertStringContainsString('Good Friday', $warnings[0]);
    }

    #[Test]
    public function second_query_for_same_year_is_idempotent(): void
    {
        $this->makeUserWithPermissions(['holidays.manage']);

        HolidayDefinition::factory()->obligatorio()->create([
            'name' => 'New Year',
            'recurrence_type' => 'fixed',
            'recurrence_config' => ['month' => 1, 'day' => 1],
            'is_annual' => true,
        ]);

        $this->getJson('/api/v1/holidays?year=2026')->assertStatus(200);
        $this->getJson('/api/v1/holidays?year=2026')->assertStatus(200);

        // Only one instance should exist (no duplicates)
        $this->assertDatabaseCount('holidays', 1);
    }
}
