<?php

namespace Tests\Unit\Policies;

use App\Policies\CashRegisterPolicy;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class CashRegisterPolicyTest extends TestCase
{
    #[Test]
    public function it_never_allows_restore(): void
    {
        $this->assertFalse((new CashRegisterPolicy)->restore());
    }

    #[Test]
    public function it_never_allows_force_delete(): void
    {
        $this->assertFalse((new CashRegisterPolicy)->forceDelete());
    }
}
