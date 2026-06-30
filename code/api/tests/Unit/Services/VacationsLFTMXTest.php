<?php

namespace Tests\Unit\Services;

use App\Services\VacationRules\VacationsLFTMX;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class VacationsLFTMXTest extends TestCase
{
    private VacationsLFTMX $rule;

    protected function setUp(): void
    {
        parent::setUp();
        $this->rule = new VacationsLFTMX;
    }

    #[Test]
    public function it_returns_12_days_for_year_1(): void
    {
        $this->assertSame(12, $this->rule->calculate(1));
    }

    #[Test]
    public function it_returns_14_days_for_year_2(): void
    {
        $this->assertSame(14, $this->rule->calculate(2));
    }

    #[Test]
    public function it_returns_16_days_for_year_3(): void
    {
        $this->assertSame(16, $this->rule->calculate(3));
    }

    #[Test]
    public function it_returns_20_days_for_year_5(): void
    {
        $this->assertSame(20, $this->rule->calculate(5));
    }

    #[Test]
    #[DataProvider('bracketProvider')]
    public function it_returns_correct_days_for_multi_year_brackets(int $years, int $expected): void
    {
        $this->assertSame($expected, $this->rule->calculate($years));
    }

    public static function bracketProvider(): array
    {
        return [
            'year 6' => [6, 22],
            'year 10' => [10, 22],
            'year 11' => [11, 24],
            'year 15' => [15, 24],
            'year 16' => [16, 26],
            'year 20' => [20, 26],
            'year 21' => [21, 28],
            'year 25' => [25, 28],
            'year 26' => [26, 30],
            'year 30' => [30, 30],
            'year 31' => [31, 32],
        ];
    }

    #[Test]
    public function it_has_a_human_readable_label(): void
    {
        $this->assertNotEmpty($this->rule->label());
        $this->assertIsString($this->rule->label());
    }

    #[Test]
    public function it_returns_a_non_empty_table(): void
    {
        $table = $this->rule->table();
        $this->assertIsArray($table);
        $this->assertNotEmpty($table);
        foreach ($table as $row) {
            $this->assertArrayHasKey('years', $row);
            $this->assertArrayHasKey('days', $row);
        }
    }
}
