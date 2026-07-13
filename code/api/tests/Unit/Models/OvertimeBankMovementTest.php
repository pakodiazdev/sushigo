<?php

namespace Tests\Unit\Models;

use App\Enums\OvertimeMovementType;
use App\Enums\OvertimeOrigin;
use App\Models\OvertimeBankMovement;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

class OvertimeBankMovementTest extends TestCase
{
    #[Test]
    #[DataProvider('balanceImpactCases')]
    public function balance_impact_reflects_movement_type(OvertimeMovementType $type, int $minutes, int $expected): void
    {
        $movement = new OvertimeBankMovement;
        $movement->movement_type = $type;
        $movement->minutes = $minutes;

        $this->assertSame($expected, $movement->balanceImpact());
    }

    public static function balanceImpactCases(): array
    {
        return [
            'earned adds minutes' => [OvertimeMovementType::EARNED, 60, 60],
            'used subtracts minutes' => [OvertimeMovementType::USED, 30, -30],
            'paid subtracts minutes' => [OvertimeMovementType::PAID, 45, -45],
            'adjustment keeps positive sign' => [OvertimeMovementType::ADJUSTMENT, 15, 15],
            'adjustment keeps negative sign' => [OvertimeMovementType::ADJUSTMENT, -15, -15],
        ];
    }

    #[Test]
    public function origin_enum_has_auto_and_manual(): void
    {
        $this->assertSame('AUTO', OvertimeOrigin::AUTO->value);
        $this->assertSame('MANUAL', OvertimeOrigin::MANUAL->value);
    }
}
