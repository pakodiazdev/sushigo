<?php

declare(strict_types=1);

namespace Tests\Unit\Support;

use App\Support\VariantSkuGenerator;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class VariantSkuGeneratorTest extends TestCase
{
    #[Test]
    #[DataProvider('contexts')]
    public function it_normalizes_context_into_a_deterministic_stem(
        string $product,
        string $variant,
        string $uom,
        string $expected,
    ): void {
        $this->assertSame($expected, VariantSkuGenerator::deriveStem($product, $variant, $uom));
    }

    public static function contexts(): array
    {
        return [
            'base unit quantity one is collapsed' => ['Arroz Premium', '1 kg', 'KG', 'ARR-KG'],
            'quantity remains semantic' => ['Arroz Premium', '500 g', 'G', 'ARR-500G'],
            'accents and punctuation are equivalent' => ['Árroz Premium', '500-g', 'g', 'ARR-500G'],
            'uom is appended when absent' => ['Café molido', 'Bolsa grande', 'KG', 'CAF-BOLSAGRANDE-KG'],
            'non-alphanumeric variant falls back to uom' => ['Coca-Cola', '---', 'ML', 'COC-ML'],
            'short product falls back' => ['Té', '250 g', 'G', 'ITEM-250G'],
        ];
    }

    #[Test]
    public function it_reserves_room_for_a_collision_suffix_at_the_maximum_length(): void
    {
        $stem = VariantSkuGenerator::deriveStem(str_repeat('Producto', 20), str_repeat('Presentacion', 20), 'KG');

        $this->assertSame(100, mb_strlen($stem));
        $this->assertSame(100, mb_strlen(VariantSkuGenerator::withSuffix($stem, 2)));
        $this->assertStringEndsWith('-002', VariantSkuGenerator::withSuffix($stem, 2));
    }
}
