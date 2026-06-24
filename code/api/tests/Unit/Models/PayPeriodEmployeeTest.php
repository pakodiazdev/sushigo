<?php

namespace Tests\Unit\Models;

use App\Models\PayPeriodEmployee;
use PHPUnit\Framework\TestCase;

class PayPeriodEmployeeTest extends TestCase
{
    public function test_calculate_total_sums_all_positive_concepts(): void
    {
        $ppe = new PayPeriodEmployee;
        $ppe->base_pay = '1000.00';
        $ppe->late_deductions = '0.00';
        $ppe->unpaid_leave_deductions = '0.00';
        $ppe->overtime_pay = '200.00';
        $ppe->extra_day_pay = '150.00';
        $ppe->punctuality_bonus = '50.00';
        $ppe->holiday_pay = '300.00';
        $ppe->other_adjustments = '0.00';

        $this->assertEqualsWithDelta(1700.0, $ppe->calculateTotal(), 0.001);
    }

    public function test_calculate_total_subtracts_deductions(): void
    {
        $ppe = new PayPeriodEmployee;
        $ppe->base_pay = '1000.00';
        $ppe->late_deductions = '80.00';
        $ppe->unpaid_leave_deductions = '40.00';
        $ppe->overtime_pay = '0.00';
        $ppe->extra_day_pay = '0.00';
        $ppe->punctuality_bonus = '0.00';
        $ppe->holiday_pay = '0.00';
        $ppe->other_adjustments = '0.00';

        $this->assertEqualsWithDelta(880.0, $ppe->calculateTotal(), 0.001);
    }

    public function test_calculate_total_with_all_concepts(): void
    {
        $ppe = new PayPeriodEmployee;
        $ppe->base_pay = '5000.00';
        $ppe->late_deductions = '100.00';
        $ppe->unpaid_leave_deductions = '50.00';
        $ppe->overtime_pay = '300.00';
        $ppe->extra_day_pay = '500.00';
        $ppe->punctuality_bonus = '200.00';
        $ppe->holiday_pay = '0.00';
        $ppe->other_adjustments = '-25.00';

        // 5000 - 100 - 50 + 300 + 500 + 200 + 0 + (-25) = 5825
        $this->assertEqualsWithDelta(5825.0, $ppe->calculateTotal(), 0.001);
    }
}
