<?php

declare(strict_types=1);

namespace Tests\Feature\Holidays;

use App\Models\Holiday;
use App\Models\HolidayDefinition;
use PHPUnit\Framework\Attributes\Test;

class HolidayDefinitionCrudTest extends HolidayTestCase
{
    // ── CREATE ────────────────────────────────────────────────────────────────

    #[Test]
    public function create_returns_201_with_all_fields(): void
    {
        $this->makeUserWithPermissions(['holidays.manage']);

        $this->postJson('/api/v1/holiday-definitions', [
            'name' => 'Independence Day',
            'description' => 'National holiday',
            'type' => 'obligatorio',
            'is_annual' => true,
            'recurrence_type' => 'fixed',
            'recurrence_config' => ['month' => 9, 'day' => 16],
        ])
            ->assertStatus(201)
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'name',
                    'description',
                    'type',
                    'pay_multiplier',
                    'effective_pay_multiplier',
                    'is_annual',
                    'recurrence_type',
                    'recurrence_config',
                    'created_at',
                ],
            ])
            ->assertJsonPath('data.name', 'Independence Day')
            ->assertJsonPath('data.type', 'obligatorio')
            ->assertJsonPath('data.is_annual', true);
    }

    #[Test]
    public function create_with_obligatorio_ignores_pay_multiplier_and_uses_3(): void
    {
        $this->makeUserWithPermissions(['holidays.manage']);

        $this->postJson('/api/v1/holiday-definitions', [
            'name' => 'Labor Day',
            'type' => 'obligatorio',
            'is_annual' => true,
            'recurrence_type' => 'fixed',
            'recurrence_config' => ['month' => 5, 'day' => 1],
            'pay_multiplier' => 1.50, // should be ignored
        ])
            ->assertStatus(201)
            ->assertJsonPath('data.pay_multiplier', 3)
            ->assertJsonPath('data.effective_pay_multiplier', 3);
    }

    #[Test]
    public function create_with_asueto_ignores_pay_multiplier_and_uses_2(): void
    {
        $this->makeUserWithPermissions(['holidays.manage']);

        $this->postJson('/api/v1/holiday-definitions', [
            'name' => 'Good Friday',
            'type' => 'asueto',
            'is_annual' => true,
            'recurrence_type' => 'floating',
            'recurrence_config' => [],
            'pay_multiplier' => 1.50, // should be ignored
        ])
            ->assertStatus(201)
            ->assertJsonPath('data.pay_multiplier', 2)
            ->assertJsonPath('data.effective_pay_multiplier', 2);
    }

    #[Test]
    public function create_with_is_annual_true_generates_instance_for_current_year(): void
    {
        $this->makeUserWithPermissions(['holidays.manage']);

        $currentYear = now()->year;

        $this->postJson('/api/v1/holiday-definitions', [
            'name' => 'New Year',
            'type' => 'obligatorio',
            'is_annual' => true,
            'recurrence_type' => 'fixed',
            'recurrence_config' => ['month' => 1, 'day' => 1],
        ])->assertStatus(201);

        $this->assertDatabaseHas('holidays', [
            'date' => "{$currentYear}-01-01",
            'name' => 'New Year',
            'is_auto_generated' => true,
        ]);
    }

    #[Test]
    public function create_with_is_annual_false_creates_holiday_instance_for_date(): void
    {
        $this->makeUserWithPermissions(['holidays.manage']);

        $this->postJson('/api/v1/holiday-definitions', [
            'name' => 'One-Off Holiday',
            'type' => 'asueto',
            'is_annual' => false,
            'recurrence_type' => 'none',
            'recurrence_config' => [],
            'date' => '2026-07-15',
        ])->assertStatus(201);

        $this->assertDatabaseHas('holidays', [
            'date' => '2026-07-15',
            'name' => 'One-Off Holiday',
            'is_auto_generated' => false,
        ]);
    }

    #[Test]
    public function create_rejects_unauthenticated(): void
    {
        $this->postJson('/api/v1/holiday-definitions', ['name' => 'Test'])->assertStatus(401);
    }

    #[Test]
    public function create_rejects_user_without_permission(): void
    {
        $this->makeUserWithNoPermissions();

        $this->postJson('/api/v1/holiday-definitions', ['name' => 'Test'])->assertStatus(403);
    }

    #[Test]
    public function create_validates_recurrence_config_month_required_for_fixed(): void
    {
        $this->makeUserWithPermissions(['holidays.manage']);

        $this->postJson('/api/v1/holiday-definitions', [
            'name' => 'Independence Day',
            'type' => 'obligatorio',
            'recurrence_type' => 'fixed',
            'recurrence_config' => ['day' => 16], // missing month
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['recurrence_config.month']);
    }

    // ── LIST ──────────────────────────────────────────────────────────────────

    #[Test]
    public function list_returns_all_definitions(): void
    {
        $this->makeUserWithPermissions(['holidays.manage']);
        HolidayDefinition::factory()->count(3)->create();

        $this->getJson('/api/v1/holiday-definitions')
            ->assertStatus(200)
            ->assertJsonCount(3, 'data');
    }

    #[Test]
    public function list_rejects_unauthenticated(): void
    {
        $this->getJson('/api/v1/holiday-definitions')->assertStatus(401);
    }

    #[Test]
    public function list_rejects_user_without_permission(): void
    {
        $this->makeUserWithNoPermissions();

        $this->getJson('/api/v1/holiday-definitions')->assertStatus(403);
    }

    // ── UPDATE ────────────────────────────────────────────────────────────────

    #[Test]
    public function update_modifies_the_definition(): void
    {
        $this->makeUserWithPermissions(['holidays.manage']);
        $definition = HolidayDefinition::factory()->obligatorio()->create(['name' => 'Old Name']);

        $this->putJson("/api/v1/holiday-definitions/{$definition->id}", [
            'name' => 'New Name',
        ])
            ->assertStatus(200)
            ->assertJsonPath('data.name', 'New Name');
    }

    #[Test]
    public function update_rejects_unauthenticated(): void
    {
        $definition = HolidayDefinition::factory()->create();

        $this->putJson("/api/v1/holiday-definitions/{$definition->id}", ['name' => 'Test'])->assertStatus(401);
    }

    #[Test]
    public function update_rejects_user_without_permission(): void
    {
        $this->makeUserWithNoPermissions();
        $definition = HolidayDefinition::factory()->create();

        $this->putJson("/api/v1/holiday-definitions/{$definition->id}", ['name' => 'Test'])->assertStatus(403);
    }

    // ── DELETE ────────────────────────────────────────────────────────────────

    #[Test]
    public function delete_removes_definition_and_nullifies_holiday_definition_id(): void
    {
        $this->makeUserWithPermissions(['holidays.manage']);
        $definition = HolidayDefinition::factory()->obligatorio()->create();

        $holiday = Holiday::factory()->create([
            'definition_id' => $definition->id,
            'date' => '2026-01-01',
            'is_auto_generated' => true,
        ]);

        $this->deleteJson("/api/v1/holiday-definitions/{$definition->id}")
            ->assertStatus(204);

        $this->assertDatabaseMissing('holiday_definitions', ['id' => $definition->id]);

        // Holiday instance must still exist, with definition_id = null
        $this->assertDatabaseHas('holidays', [
            'id' => $holiday->id,
            'definition_id' => null,
        ]);
    }

    #[Test]
    public function delete_rejects_unauthenticated(): void
    {
        $definition = HolidayDefinition::factory()->create();

        $this->deleteJson("/api/v1/holiday-definitions/{$definition->id}")->assertStatus(401);
    }

    #[Test]
    public function delete_rejects_user_without_permission(): void
    {
        $this->makeUserWithNoPermissions();
        $definition = HolidayDefinition::factory()->create();

        $this->deleteJson("/api/v1/holiday-definitions/{$definition->id}")->assertStatus(403);
    }
}
