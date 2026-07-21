<?php

namespace Tests\Unit\Policies;

use App\Policies\CashTerminalPolicy;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class CashTerminalPolicyTest extends TestCase
{
    #[Test]
    public function it_never_allows_restore(): void
    {
        $this->assertFalse((new CashTerminalPolicy)->restore());
    }

    #[Test]
    public function it_never_allows_force_delete(): void
    {
        $this->assertFalse((new CashTerminalPolicy)->forceDelete());
    }
}
