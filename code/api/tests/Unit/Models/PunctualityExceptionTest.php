<?php

namespace Tests\Unit\Models;

use App\Models\PunctualityException;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

class PunctualityExceptionTest extends TestCase
{
    #[Test]
    public function it_matches_sunday_using_iso_8601_numbering(): void
    {
        $exception = new PunctualityException(['day_of_week' => 7]);

        $this->assertTrue($exception->appliesToDay(7));
        $this->assertFalse($exception->appliesToDay(0));
    }

    #[Test]
    public function it_matches_monday_through_saturday(): void
    {
        $exception = new PunctualityException(['day_of_week' => 1]);

        $this->assertTrue($exception->appliesToDay(1));
        $this->assertFalse($exception->appliesToDay(2));
    }

    #[Test]
    public function null_day_of_week_applies_to_every_day(): void
    {
        $exception = new PunctualityException(['day_of_week' => null]);

        foreach (range(1, 7) as $isoDay) {
            $this->assertTrue($exception->appliesToDay($isoDay));
        }
    }
}
