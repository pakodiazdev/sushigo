<?php

declare(strict_types=1);

namespace Tests\Unit\Models;

use App\Models\HolidayDefinition;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class HolidayDefinitionTest extends TestCase
{
    use RefreshDatabase;

    // ── getEffectivePayMultiplier ─────────────────────────────────────────────

    #[Test]
    public function get_effective_pay_multiplier_returns_3_for_obligatorio(): void
    {
        $definition = new HolidayDefinition([
            'type' => 'obligatorio',
            'pay_multiplier' => 1.50,
        ]);

        $this->assertSame(3.0, $definition->getEffectivePayMultiplier());
    }

    #[Test]
    public function get_effective_pay_multiplier_returns_2_for_asueto(): void
    {
        $definition = new HolidayDefinition([
            'type' => 'asueto',
            'pay_multiplier' => 1.50,
        ]);

        $this->assertSame(2.0, $definition->getEffectivePayMultiplier());
    }

    #[Test]
    public function get_effective_pay_multiplier_returns_own_value_for_opcional(): void
    {
        $definition = new HolidayDefinition([
            'type' => 'opcional',
            'pay_multiplier' => 1.75,
        ]);

        $this->assertSame(1.75, $definition->getEffectivePayMultiplier());
    }

    // ── Scope annual ──────────────────────────────────────────────────────────

    #[Test]
    public function scope_annual_filters_only_annual_definitions(): void
    {
        HolidayDefinition::factory()->create(['is_annual' => true, 'name' => 'Annual One']);
        HolidayDefinition::factory()->create(['is_annual' => true, 'name' => 'Annual Two']);
        HolidayDefinition::factory()->create(['is_annual' => false, 'name' => 'One-Time']);

        $annual = HolidayDefinition::annual()->get();

        $this->assertCount(2, $annual);
        $this->assertTrue($annual->every(fn (HolidayDefinition $d) => $d->is_annual));
    }
}
