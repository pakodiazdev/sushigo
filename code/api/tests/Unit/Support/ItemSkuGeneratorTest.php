<?php

namespace Tests\Unit\Support;

use App\Support\ItemSkuGenerator;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ItemSkuGeneratorTest extends TestCase
{
    /**
     * @return array<string, array{0: ?string, 1: string}>
     */
    public static function prefixCases(): array
    {
        return [
            'plain word' => ['Refrigerador', 'REF-'],
            'first token wins' => ['Salmón fresco', 'SAL-'],
            'accents folded' => ['Ámbar', 'AMB-'],
            'ñ folded to n' => ['Ñandú seco', 'NAN-'],
            'punctuation and whitespace stripped' => ['  a.b-c d ', 'ABC-'],
            'lowercase uppercased' => ['salsa', 'SAL-'],
            'digits are kept' => ['3M cinta', '3MC-'],
            'too short falls back' => ['Té', 'ITEM-'],
            'single letter falls back' => ['A', 'ITEM-'],
            'symbols only falls back' => ['!!! ---', 'ITEM-'],
            'empty string falls back' => ['', 'ITEM-'],
            'null falls back' => [null, 'ITEM-'],
            'whitespace only falls back' => ['   ', 'ITEM-'],
        ];
    }

    #[Test]
    #[DataProvider('prefixCases')]
    public function it_derives_a_deterministic_contextual_prefix(?string $name, string $expected): void
    {
        $this->assertSame($expected, ItemSkuGenerator::derivePrefix($name));
    }

    #[Test]
    public function it_is_deterministic_across_repeated_calls(): void
    {
        $this->assertSame(
            ItemSkuGenerator::derivePrefix('Salmón fresco'),
            ItemSkuGenerator::derivePrefix('Salmón fresco'),
        );
    }

    #[Test]
    public function the_generator_exposes_the_derived_prefix(): void
    {
        $this->assertSame('SAL-', (new ItemSkuGenerator('Salmón fresco'))->prefix());
        $this->assertSame('ITEM-', (new ItemSkuGenerator(null))->prefix());
    }
}
