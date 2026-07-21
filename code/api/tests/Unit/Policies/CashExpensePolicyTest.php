<?php

namespace Tests\Unit\Policies;

use App\Policies\CashExpensePolicy;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class CashExpensePolicyTest extends TestCase
{
    #[Test]
    public function it_never_allows_restore(): void
    {
        $this->assertFalse((new CashExpensePolicy)->restore());
    }

    #[Test]
    public function it_never_allows_force_delete(): void
    {
        $this->assertFalse((new CashExpensePolicy)->forceDelete());
    }
}
