<?php

namespace Tests\Feature\AttendancePayroll;

use App\Models\Employee;
use App\Models\EmploymentPeriod;
use Carbon\Carbon;
use Database\Seeders\Development\AttendanceHistorySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AttendanceHistorySeederTest extends TestCase
{
    use RefreshDatabase;

    private const TODAY = '2026-04-15';

    protected function setUp(): void
    {
        parent::setUp();

        foreach (Employee::POSITION_ROLES as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);
        }

        Carbon::setTestNow(Carbon::parse(self::TODAY.' 10:00:00'));
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    #[Test]
    public function does_not_create_an_attendance_record_for_today(): void
    {
        $period = EmploymentPeriod::factory()->create([
            'is_active' => true,
            'start_date' => '2026-04-05',
        ]);

        $this->seed(AttendanceHistorySeeder::class);

        $this->assertDatabaseMissing('attendances', [
            'employee_id' => $period->employee_id,
            'date' => self::TODAY,
        ]);

        $rowsBeforeToday = DB::table('attendances')
            ->where('employee_id', $period->employee_id)
            ->where('date', '<', self::TODAY)
            ->count();

        $this->assertGreaterThan(0, $rowsBeforeToday);
    }
}
