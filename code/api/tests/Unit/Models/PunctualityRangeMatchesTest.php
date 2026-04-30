<?php

namespace Tests\Unit\Models;

use App\Models\PunctualityRange;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PunctualityRangeMatchesTest extends TestCase
{
    private static function range(int $min, ?int $max): PunctualityRange
    {
        $r = new PunctualityRange;
        $r->min_seconds = $min;
        $r->max_seconds = $max;

        return $r;
    }

    public static function boundaryProvider(): array
    {
        return [
            // [min, max, lateSeconds, expected]
            'below min returns false' => [600, 899, 599, false],
            'at min returns true' => [600, 899, 600, true],
            'within range returns true' => [600, 899, 750, true],
            'at max returns true' => [600, 899, 899, true],
            'above max returns false' => [600, 899, 900, false],
            'open-ended: at min returns true' => [1560, null, 1560, true],
            'open-ended: above min true' => [1560, null, 9999, true],
            'open-ended: below min false' => [1560, null, 1559, false],
            'zero min: zero seconds true' => [0, 599, 0, true],
        ];
    }

    #[Test]
    #[DataProvider('boundaryProvider')]
    public function matches_boundary_cases(int $min, ?int $max, int $lateSeconds, bool $expected): void
    {
        $range = self::range($min, $max);
        $this->assertSame($expected, $range->matches($lateSeconds));
    }
}
