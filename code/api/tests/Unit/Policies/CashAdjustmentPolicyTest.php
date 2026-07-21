<?php

namespace Tests\Unit\Policies;

use App\Policies\CashAdjustmentPolicy;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class CashAdjustmentPolicyTest extends TestCase
{
    #[Test]
    public function it_never_allows_restore(): void
    {
        $this->assertFalse((new CashAdjustmentPolicy)->restore());
    }

    #[Test]
    public function it_never_allows_force_delete(): void
    {
        $this->assertFalse((new CashAdjustmentPolicy)->forceDelete());
    }
}
