<?php

namespace Tests\Unit\Services;

use App\Services\VacationRules\CustomVacationPolicy;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class CustomVacationPolicyTest extends TestCase
{
    private function policy(?array $tiers = null): CustomVacationPolicy
    {
        $tiers ??= [
            ['years_from' => 1, 'days' => 15],
            ['years_from' => 3, 'days' => 20],
            ['years_from' => 6, 'days' => 25],
        ];

        return new CustomVacationPolicy($tiers, 'Política de la empresa', 'CustomCompanyPolicy');
    }

    #[Test]
    public function it_returns_days_from_the_matching_tier(): void
    {
        $policy = $this->policy();

        $this->assertSame(15, $policy->calculate(1));
        $this->assertSame(15, $policy->calculate(2));
        $this->assertSame(20, $policy->calculate(3));
        $this->assertSame(20, $policy->calculate(5));
        $this->assertSame(25, $policy->calculate(6));
        $this->assertSame(25, $policy->calculate(50));
    }

    #[Test]
    public function it_returns_zero_when_years_are_below_the_lowest_tier(): void
    {
        $policy = $this->policy([
            ['years_from' => 2, 'days' => 15],
        ]);

        $this->assertSame(0, $policy->calculate(1));
    }

    #[Test]
    public function it_returns_zero_for_an_empty_table(): void
    {
        $policy = $this->policy([]);

        $this->assertSame(0, $policy->calculate(5));
    }

    #[Test]
    public function it_ignores_tier_input_order(): void
    {
        $ordered = $this->policy([
            ['years_from' => 1, 'days' => 12],
            ['years_from' => 5, 'days' => 20],
        ]);

        $shuffled = $this->policy([
            ['years_from' => 5, 'days' => 20],
            ['years_from' => 1, 'days' => 12],
        ]);

        $this->assertSame($ordered->calculate(7), $shuffled->calculate(7));
    }

    #[Test]
    public function it_exposes_the_injected_label_and_key(): void
    {
        $policy = new CustomVacationPolicy([], 'Política contractual', 'ContractualPolicy');

        $this->assertSame('Política contractual', $policy->label());
        $this->assertSame('ContractualPolicy', $policy->key());
    }

    #[Test]
    public function it_builds_a_display_table_with_closed_and_open_ended_ranges(): void
    {
        $policy = $this->policy();

        $this->assertSame([
            ['years' => '1–2', 'days' => 15],
            ['years' => '3–5', 'days' => 20],
            ['years' => '6+', 'days' => 25],
        ], $policy->table());
    }

    #[Test]
    public function it_collapses_adjacent_single_year_tiers_in_the_display_table(): void
    {
        $policy = $this->policy([
            ['years_from' => 1, 'days' => 12],
            ['years_from' => 2, 'days' => 14],
        ]);

        $this->assertSame([
            ['years' => '1', 'days' => 12],
            ['years' => '2+', 'days' => 14],
        ], $policy->table());
    }

    #[Test]
    public function it_returns_an_empty_display_table_for_no_tiers(): void
    {
        $this->assertSame([], $this->policy([])->table());
    }
}
