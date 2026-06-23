<?php

namespace Tests\Feature\Holidays;

use App\Models\Holiday;
use App\Models\HolidayDefinition;
use PHPUnit\Framework\Attributes\Test;

class HolidayCrudTest extends HolidayTestCase
{
    // ── LIST ─────────────────────────────────────────────────────────────────

    #[Test]
    public function list_returns_all_holidays(): void
    {
        $this->makeUserWithPermissions(['holidays.manage']);
        Holiday::factory()->count(3)->create();

        $this->getJson('/api/v1/holidays')
            ->assertStatus(200)
            ->assertJsonCount(3, 'data')
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'date', 'name', 'pay_multiplier', 'created_at'],
                ],
            ]);
    }

    #[Test]
    public function list_filters_by_year(): void
    {
        $this->makeUserWithPermissions(['holidays.manage']);
        Holiday::factory()->create(['date' => '2026-01-01', 'name' => 'New Year 2026']);
        Holiday::factory()->create(['date' => '2027-01-01', 'name' => 'New Year 2027']);

        $this->getJson('/api/v1/holidays?year=2026')
            ->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'New Year 2026');
    }

    #[Test]
    public function list_returns_empty_when_no_holidays(): void
    {
        $this->makeUserWithPermissions(['holidays.manage']);

        $this->getJson('/api/v1/holidays')
            ->assertStatus(200)
            ->assertJsonCount(0, 'data');
    }

    #[Test]
    public function list_rejects_unauthenticated(): void
    {
        $this->getJson('/api/v1/holidays')->assertStatus(401);
    }

    #[Test]
    public function list_rejects_user_without_permission(): void
    {
        $this->makeUserWithNoPermissions();

        $this->getJson('/api/v1/holidays')->assertStatus(403);
    }

    // ── CREATE ────────────────────────────────────────────────────────────────

    #[Test]
    public function create_returns_201_with_holiday_data(): void
    {
        $this->makeUserWithPermissions(['holidays.manage']);

        $this->postJson('/api/v1/holidays', [
            'date' => '2026-01-01',
            'name' => 'New Year\'s Day',
            'pay_multiplier' => 2.00,
        ])
            ->assertStatus(201)
            ->assertJsonPath('data.date', '2026-01-01')
            ->assertJsonPath('data.name', "New Year's Day")
            ->assertJsonPath('data.pay_multiplier', 2);
    }

    #[Test]
    public function create_uses_default_pay_multiplier(): void
    {
        $this->makeUserWithPermissions(['holidays.manage']);

        $this->postJson('/api/v1/holidays', [
            'date' => '2026-02-02',
            'name' => 'Constitution Day',
        ])
            ->assertStatus(201)
            ->assertJsonPath('data.pay_multiplier', 2);
    }

    #[Test]
    public function create_rejects_duplicate_date(): void
    {
        $this->makeUserWithPermissions(['holidays.manage']);
        Holiday::factory()->create(['date' => '2026-01-01']);

        $this->postJson('/api/v1/holidays', [
            'date' => '2026-01-01',
            'name' => 'Duplicate',
        ])
            ->assertStatus(422)
            ->assertJsonPath('errors.date.0', 'A holiday already exists for this date.');
    }

    #[Test]
    public function create_rejects_missing_required_fields(): void
    {
        $this->makeUserWithPermissions(['holidays.manage']);

        $this->postJson('/api/v1/holidays', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['date', 'name']);
    }

    #[Test]
    public function create_rejects_unauthenticated(): void
    {
        $this->postJson('/api/v1/holidays', [
            'date' => '2026-01-01',
            'name' => 'New Year\'s Day',
        ])->assertStatus(401);
    }

    #[Test]
    public function create_rejects_user_without_permission(): void
    {
        $this->makeUserWithNoPermissions();

        $this->postJson('/api/v1/holidays', [
            'date' => '2026-01-01',
            'name' => 'New Year\'s Day',
        ])->assertStatus(403);
    }

    // ── UPDATE ────────────────────────────────────────────────────────────────

    #[Test]
    public function update_returns_200_with_updated_data(): void
    {
        $this->makeUserWithPermissions(['holidays.manage']);
        $holiday = Holiday::factory()->create(['date' => '2026-01-01', 'name' => 'Old Name']);

        $this->putJson("/api/v1/holidays/{$holiday->id}", [
            'name' => 'New Year\'s Day Updated',
            'pay_multiplier' => 3.00,
        ])
            ->assertStatus(200)
            ->assertJsonPath('data.name', "New Year's Day Updated")
            ->assertJsonPath('data.pay_multiplier', 3);
    }

    #[Test]
    public function update_returns_404_for_nonexistent_holiday(): void
    {
        $this->makeUserWithPermissions(['holidays.manage']);

        $this->putJson('/api/v1/holidays/999999', ['name' => 'Updated'])
            ->assertStatus(404);
    }

    #[Test]
    public function update_rejects_duplicate_date_for_another_holiday(): void
    {
        $this->makeUserWithPermissions(['holidays.manage']);
        Holiday::factory()->create(['date' => '2026-01-01', 'name' => 'Holiday A']);
        $holidayB = Holiday::factory()->create(['date' => '2026-02-02', 'name' => 'Holiday B']);

        $this->putJson("/api/v1/holidays/{$holidayB->id}", ['date' => '2026-01-01'])
            ->assertStatus(422)
            ->assertJsonPath('errors.date.0', 'A holiday already exists for this date.');
    }

    #[Test]
    public function update_allows_same_date_for_same_holiday(): void
    {
        $this->makeUserWithPermissions(['holidays.manage']);
        $holiday = Holiday::factory()->create(['date' => '2026-01-01', 'name' => 'Holiday A']);

        $this->putJson("/api/v1/holidays/{$holiday->id}", [
            'date' => '2026-01-01',
            'name' => 'Holiday A Updated',
        ])
            ->assertStatus(200)
            ->assertJsonPath('data.date', '2026-01-01');
    }

    #[Test]
    public function update_rejects_unauthenticated(): void
    {
        $holiday = Holiday::factory()->create();

        $this->putJson("/api/v1/holidays/{$holiday->id}", ['name' => 'Updated'])
            ->assertStatus(401);
    }

    #[Test]
    public function update_rejects_user_without_permission(): void
    {
        $this->makeUserWithNoPermissions();
        $holiday = Holiday::factory()->create();

        $this->putJson("/api/v1/holidays/{$holiday->id}", ['name' => 'Updated'])
            ->assertStatus(403);
    }

    // ── DELETE ────────────────────────────────────────────────────────────────

    #[Test]
    public function delete_returns_204(): void
    {
        $this->makeUserWithPermissions(['holidays.manage']);
        $holiday = Holiday::factory()->create();

        $this->deleteJson("/api/v1/holidays/{$holiday->id}")
            ->assertStatus(204);

        $this->assertDatabaseMissing('holidays', ['id' => $holiday->id]);
    }

    #[Test]
    public function delete_returns_404_for_nonexistent_holiday(): void
    {
        $this->makeUserWithPermissions(['holidays.manage']);

        $this->deleteJson('/api/v1/holidays/999999')
            ->assertStatus(404);
    }

    #[Test]
    public function delete_also_removes_definition_when_holiday_is_linked(): void
    {
        $this->makeUserWithPermissions(['holidays.manage']);
        $definition = HolidayDefinition::factory()->create(['is_annual' => true]);
        $holiday = Holiday::factory()->create([
            'definition_id' => $definition->id,
            'is_auto_generated' => true,
        ]);

        $this->deleteJson("/api/v1/holidays/{$holiday->id}")
            ->assertStatus(204);

        $this->assertDatabaseMissing('holidays', ['id' => $holiday->id]);
        $this->assertDatabaseMissing('holiday_definitions', ['id' => $definition->id]);
    }

    #[Test]
    public function delete_with_definition_nullifies_other_linked_holidays(): void
    {
        $this->makeUserWithPermissions(['holidays.manage']);
        $definition = HolidayDefinition::factory()->create(['is_annual' => true]);

        $holidayToDelete = Holiday::factory()->create([
            'definition_id' => $definition->id,
            'date' => '2026-01-01',
            'is_auto_generated' => true,
        ]);

        // Another historical instance linked to the same definition
        $historicalHoliday = Holiday::factory()->create([
            'definition_id' => $definition->id,
            'date' => '2025-01-01',
            'is_auto_generated' => true,
        ]);

        $this->deleteJson("/api/v1/holidays/{$holidayToDelete->id}")
            ->assertStatus(204);

        $this->assertDatabaseMissing('holidays', ['id' => $holidayToDelete->id]);
        $this->assertDatabaseMissing('holiday_definitions', ['id' => $definition->id]);
        // Historical record preserved — definition_id nullified by FK ON DELETE SET NULL
        $this->assertDatabaseHas('holidays', [
            'id' => $historicalHoliday->id,
            'definition_id' => null,
        ]);
    }

    #[Test]
    public function delete_rejects_unauthenticated(): void
    {
        $holiday = Holiday::factory()->create();

        $this->deleteJson("/api/v1/holidays/{$holiday->id}")
            ->assertStatus(401);
    }

    #[Test]
    public function delete_rejects_user_without_permission(): void
    {
        $this->makeUserWithNoPermissions();
        $holiday = Holiday::factory()->create();

        $this->deleteJson("/api/v1/holidays/{$holiday->id}")
            ->assertStatus(403);
    }
}
