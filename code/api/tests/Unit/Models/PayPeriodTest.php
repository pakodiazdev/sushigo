<?php

namespace Tests\Unit\Models;

use App\Models\PayPeriod;
use PHPUnit\Framework\TestCase;

class PayPeriodTest extends TestCase
{
    public function test_is_open_returns_true_when_status_open(): void
    {
        $period = new PayPeriod;
        $period->status = PayPeriod::STATUS_OPEN;

        $this->assertTrue($period->isOpen());
        $this->assertFalse($period->isClosed());
    }

    public function test_is_closed_returns_true_when_status_closed(): void
    {
        $period = new PayPeriod;
        $period->status = PayPeriod::STATUS_CLOSED;

        $this->assertFalse($period->isOpen());
        $this->assertTrue($period->isClosed());
    }

    public function test_is_open_and_is_closed_both_false_when_reopened(): void
    {
        $period = new PayPeriod;
        $period->status = PayPeriod::STATUS_REOPENED;

        $this->assertFalse($period->isOpen());
        $this->assertFalse($period->isClosed());
    }

    public function test_status_constants_have_expected_values(): void
    {
        $this->assertSame('OPEN', PayPeriod::STATUS_OPEN);
        $this->assertSame('CLOSED', PayPeriod::STATUS_CLOSED);
        $this->assertSame('REOPENED', PayPeriod::STATUS_REOPENED);
    }
}
