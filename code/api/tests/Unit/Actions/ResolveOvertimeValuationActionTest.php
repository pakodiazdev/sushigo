<?php

namespace Tests\Unit\Actions;

use App\Actions\Attendances\ResolveOvertimeValuationAction;
use App\Enums\OvertimeValuationMethod;
use App\Models\Attendance;
use App\Models\Employee;
use App\Models\OvertimeLftTier;
use App\Models\WageHistory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ResolveOvertimeValuationActionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (Employee::POSITION_ROLES as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);
        }
    }

    private function employeeWithWage(string $hourlyRate): Employee
    {
        $employee = Employee::factory()->create();
        WageHistory::factory()->create([
            'employee_id' => $employee->id,
            'hourly_rate' => $hourlyRate,
            'effective_from' => '2026-01-01',
            'effective_to' => null,
        ]);

        return $employee;
    }

    #[Test]
    public function agreed_rate_computes_amount_from_the_given_rate(): void
    {
        $employee = $this->employeeWithWage('120.00');
        $attendance = Attendance::factory()->withOvertime(30)->create([
            'employee_id' => $employee->id,
            'date' => '2026-02-23',
        ]);

        $result = (new ResolveOvertimeValuationAction)($attendance, OvertimeValuationMethod::AGREED_RATE, agreedRate: 90.0);

        $this->assertSame(90.0, $result['rate_applied']);
        $this->assertSame(45.0, $result['amount']);
        $this->assertNull($result['accumulated_hours']);
    }

    #[Test]
    public function salary_factor_computes_amount_from_minute_rate_times_factor(): void
    {
        $employee = $this->employeeWithWage('120.00');
        $attendance = Attendance::factory()->withOvertime(60)->create([
            'employee_id' => $employee->id,
            'date' => '2026-02-23',
        ]);

        $result = (new ResolveOvertimeValuationAction)($attendance, OvertimeValuationMethod::SALARY_FACTOR, agreedFactor: 1.5);

        // minuteRate = 120/60 = 2; amount = 2 * 1.5 * 60 = 180
        $this->assertSame(1.5, $result['rate_applied']);
        $this->assertSame(180.0, $result['amount']);
        $this->assertNull($result['accumulated_hours']);
    }

    #[Test]
    public function lft_proportional_resolves_tier_from_accumulated_hours(): void
    {
        $employee = $this->employeeWithWage('120.00');

        OvertimeLftTier::insert([
            ['public_id' => '01TESTA0000000000000000A', 'factor' => '2.00', 'up_to_hours' => '9.00', 'sort_order' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['public_id' => '01TESTB0000000000000000B', 'factor' => '3.00', 'up_to_hours' => null, 'sort_order' => 2, 'created_at' => now(), 'updated_at' => now()],
        ]);

        $attendance = Attendance::factory()->withOvertime(120)->create([
            'employee_id' => $employee->id,
            'date' => '2026-02-23',
        ]);

        $result = (new ResolveOvertimeValuationAction)($attendance, OvertimeValuationMethod::LFT_PROPORTIONAL);

        $this->assertSame(2.0, $result['rate_applied']);
        $this->assertSame(480.0, $result['amount']);
        $this->assertSame(0.0, $result['accumulated_hours']);
    }

    #[Test]
    public function lft_proportional_splits_minutes_across_tiers_when_crossing_the_weekly_cap(): void
    {
        $employee = $this->employeeWithWage('120.00');

        OvertimeLftTier::insert([
            ['public_id' => '01TESTC0000000000000000C', 'factor' => '2.00', 'up_to_hours' => '9.00', 'sort_order' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['public_id' => '01TESTD0000000000000000D', 'factor' => '3.00', 'up_to_hours' => null, 'sort_order' => 2, 'created_at' => now(), 'updated_at' => now()],
        ]);

        // 6 hours already authorized earlier this same week
        Attendance::factory()->withOvertime(360)->create([
            'employee_id' => $employee->id,
            'date' => '2026-02-24',
            'overtime_authorized' => true,
        ]);

        // 4 more hours today: 3 complete the 9h cap (2x), 1 exceeds it (3x)
        $attendance = Attendance::factory()->withOvertime(240)->create([
            'employee_id' => $employee->id,
            'date' => '2026-02-25',
        ]);

        $result = (new ResolveOvertimeValuationAction)($attendance, OvertimeValuationMethod::LFT_PROPORTIONAL);

        // 180 min @ 2x + 60 min @ 3x, minuteRate = 2.0 → (2*2*180) + (2*3*60) = 720 + 360 = 1080
        $this->assertSame(2.25, $result['rate_applied']);
        $this->assertSame(1080.0, $result['amount']);
        $this->assertSame(6.0, $result['accumulated_hours']);
    }

    #[Test]
    public function lft_proportional_throws_when_no_tier_is_configured(): void
    {
        $employee = $this->employeeWithWage('120.00');
        $attendance = Attendance::factory()->withOvertime(60)->create([
            'employee_id' => $employee->id,
            'date' => '2026-02-23',
        ]);

        $this->expectException(ValidationException::class);

        (new ResolveOvertimeValuationAction)($attendance, OvertimeValuationMethod::LFT_PROPORTIONAL);
    }
}
