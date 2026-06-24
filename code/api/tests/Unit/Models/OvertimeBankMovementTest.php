<?php

namespace Tests\Unit\Models;

use App\Models\OvertimeBankMovement;
use PHPUnit\Framework\TestCase;

class OvertimeBankMovementTest extends TestCase
{
    public function test_type_constants_have_expected_values(): void
    {
        $this->assertSame('EARNED', OvertimeBankMovement::TYPE_EARNED);
        $this->assertSame('PAID', OvertimeBankMovement::TYPE_PAID);
        $this->assertSame('EXPIRED', OvertimeBankMovement::TYPE_EXPIRED);
        $this->assertSame('TRANSFERRED', OvertimeBankMovement::TYPE_TRANSFERRED);
    }
}
