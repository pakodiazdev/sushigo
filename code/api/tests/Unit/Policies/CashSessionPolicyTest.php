<?php

namespace Tests\Unit\Policies;

use App\Policies\CashSessionPolicy;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class CashSessionPolicyTest extends TestCase
{
    #[Test]
    public function it_never_allows_delete(): void
    {
        $this->assertFalse((new CashSessionPolicy)->delete());
    }

    #[Test]
    public function it_never_allows_restore(): void
    {
        $this->assertFalse((new CashSessionPolicy)->restore());
    }

    #[Test]
    public function it_never_allows_force_delete(): void
    {
        $this->assertFalse((new CashSessionPolicy)->forceDelete());
    }
}
