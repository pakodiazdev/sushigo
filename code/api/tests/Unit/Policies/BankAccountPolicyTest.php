<?php

namespace Tests\Unit\Policies;

use App\Policies\BankAccountPolicy;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class BankAccountPolicyTest extends TestCase
{
    #[Test]
    public function it_never_allows_restore(): void
    {
        $this->assertFalse((new BankAccountPolicy)->restore());
    }

    #[Test]
    public function it_never_allows_force_delete(): void
    {
        $this->assertFalse((new BankAccountPolicy)->forceDelete());
    }
}
