<?php

namespace Tests\Unit\Models;

use App\Models\OvertimeLftTier;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class OvertimeLftTierMatchesTest extends TestCase
{
    private static function tier(?float $upToHours): OvertimeLftTier
    {
        $tier = new OvertimeLftTier;
        $tier->up_to_hours = $upToHours;

        return $tier;
    }

    public static function boundedTierProvider(): array
    {
        return [
            'within bound' => [9.0, 5.0, true],
            'exactly at bound' => [9.0, 9.0, true],
            'beyond bound' => [9.0, 9.5, false],
        ];
    }

    #[Test]
    #[DataProvider('boundedTierProvider')]
    public function matches_when_hours_within_bound(float $upToHours, float $hours, bool $expected): void
    {
        $tier = self::tier($upToHours);

        $this->assertSame($expected, $tier->matches($hours));
    }

    #[Test]
    public function unbounded_tier_matches_any_hours(): void
    {
        $tier = self::tier(null);

        $this->assertTrue($tier->matches(0.0));
        $this->assertTrue($tier->matches(1000.0));
    }
}
