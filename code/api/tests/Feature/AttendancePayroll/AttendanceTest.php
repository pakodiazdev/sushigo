<?php

namespace Tests\Feature\AttendancePayroll;

use App\Enums\DayStatus;
use App\Models\Attendance;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AttendanceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        Role::firstOrCreate(['name' => 'employee',         'guard_name' => 'api']);
        Role::firstOrCreate(['name' => 'employee-manager', 'guard_name' => 'api']);

        foreach (Employee::POSITION_ROLES as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);
        }
    }

    // ── Creation ──────────────────────────────────────────────────────────────

    #[Test]
    public function it_can_create_an_attendance_record(): void
    {
        $employee = Employee::factory()->create();

        $attendance = Attendance::factory()->worked()->create([
            'employee_id' => $employee->id,
            'date'        => '2026-02-10',
        ]);

        $this->assertDatabaseHas('attendances', [
            'employee_id' => $employee->id,
            'date'        => '2026-02-10',
            'day_status'  => 'WORKED',
        ]);

        $this->assertNotNull($attendance->id);
    }

    // ── UNIQUE(employee_id, date) ─────────────────────────────────────────────

    #[Test]
    public function unique_constraint_prevents_two_records_for_same_employee_and_date(): void
    {
        $employee = Employee::factory()->create();

        Attendance::factory()->onDate('2026-02-10')->create(['employee_id' => $employee->id]);

        $this->expectException(QueryException::class);

        Attendance::factory()->onDate('2026-02-10')->create(['employee_id' => $employee->id]);
    }

    #[Test]
    public function same_date_is_allowed_for_different_employees(): void
    {
        $employeeA = Employee::factory()->create();
        $employeeB = Employee::factory()->create();

        Attendance::factory()->onDate('2026-02-10')->create(['employee_id' => $employeeA->id]);
        Attendance::factory()->onDate('2026-02-10')->create(['employee_id' => $employeeB->id]);

        $this->assertDatabaseCount('attendances', 2);
    }

    #[Test]
    public function same_employee_can_have_records_on_different_dates(): void
    {
        $employee = Employee::factory()->create();

        Attendance::factory()->onDate('2026-02-10')->create(['employee_id' => $employee->id]);
        Attendance::factory()->onDate('2026-02-11')->create(['employee_id' => $employee->id]);

        $this->assertDatabaseCount('attendances', 2);
    }

    // ── isEntryLateDeductible() ───────────────────────────────────────────────

    #[Test]
    public function is_entry_late_deductible_returns_false_at_exactly_1800_seconds(): void
    {
        $attendance = Attendance::factory()->make(['entry_late_seconds' => 1800]);

        $this->assertFalse($attendance->isEntryLateDeductible());
    }

    #[Test]
    public function is_entry_late_deductible_returns_true_at_1801_seconds(): void
    {
        $attendance = Attendance::factory()->make(['entry_late_seconds' => 1801]);

        $this->assertTrue($attendance->isEntryLateDeductible());
    }

    #[Test]
    public function is_entry_late_deductible_returns_false_at_zero_seconds(): void
    {
        $attendance = Attendance::factory()->make(['entry_late_seconds' => 0]);

        $this->assertFalse($attendance->isEntryLateDeductible());
    }

    // ── isLunchLateDeductible() ───────────────────────────────────────────────

    #[Test]
    public function is_lunch_late_deductible_returns_false_at_exactly_1800_seconds(): void
    {
        $attendance = Attendance::factory()->make(['lunch_late_seconds' => 1800]);

        $this->assertFalse($attendance->isLunchLateDeductible());
    }

    #[Test]
    public function is_lunch_late_deductible_returns_true_at_1801_seconds(): void
    {
        $attendance = Attendance::factory()->make(['lunch_late_seconds' => 1801]);

        $this->assertTrue($attendance->isLunchLateDeductible());
    }

    // ── entryLateMinutes() / lunchLateMinutes() ───────────────────────────────

    #[Test]
    public function entry_late_minutes_converts_seconds_to_whole_minutes_floor(): void
    {
        // 4500 seconds = 75 minutes exactly
        $this->assertSame(75, Attendance::factory()->make(['entry_late_seconds' => 4500])->entryLateMinutes());

        // 4530 seconds = 75.5 min → floor = 75
        $this->assertSame(75, Attendance::factory()->make(['entry_late_seconds' => 4530])->entryLateMinutes());

        // 59 seconds → floor = 0
        $this->assertSame(0, Attendance::factory()->make(['entry_late_seconds' => 59])->entryLateMinutes());
    }

    #[Test]
    public function lunch_late_minutes_converts_seconds_to_whole_minutes_floor(): void
    {
        $this->assertSame(30, Attendance::factory()->make(['lunch_late_seconds' => 1800])->lunchLateMinutes());
        $this->assertSame(30, Attendance::factory()->make(['lunch_late_seconds' => 1859])->lunchLateMinutes());
    }

    // ── DayStatus enum cast ───────────────────────────────────────────────────

    #[Test]
    public function day_status_is_cast_to_day_status_enum(): void
    {
        $employee   = Employee::factory()->create();
        $attendance = Attendance::factory()->worked()->create(['employee_id' => $employee->id]);

        $attendance->refresh();

        $this->assertInstanceOf(DayStatus::class, $attendance->day_status);
        $this->assertSame(DayStatus::WORKED, $attendance->day_status);
    }

    #[Test]
    public function all_day_status_values_are_accepted(): void
    {
        $employee = Employee::factory()->create();
        $date     = '2026-01-01';

        foreach (DayStatus::cases() as $index => $status) {
            Attendance::factory()->create([
                'employee_id' => $employee->id,
                'date'        => now()->addDays($index)->toDateString(),
                'day_status'  => $status,
                'check_in'    => null,
                'check_out'   => null,
            ]);
        }

        $this->assertDatabaseCount('attendances', count(DayStatus::cases()));
    }

    // ── Relationship ──────────────────────────────────────────────────────────

    #[Test]
    public function attendance_belongs_to_employee(): void
    {
        $employee   = Employee::factory()->create();
        $attendance = Attendance::factory()->create(['employee_id' => $employee->id]);

        $this->assertTrue($attendance->employee->is($employee));
    }

    #[Test]
    public function employee_has_many_attendances(): void
    {
        $employee = Employee::factory()->create();

        Attendance::factory()->onDate('2026-02-10')->create(['employee_id' => $employee->id]);
        Attendance::factory()->onDate('2026-02-11')->create(['employee_id' => $employee->id]);
        Attendance::factory()->onDate('2026-02-12')->create(['employee_id' => $employee->id]);

        $this->assertCount(3, $employee->attendances);
    }

    // ── Scopes ────────────────────────────────────────────────────────────────

    #[Test]
    public function scope_by_date_filters_by_date(): void
    {
        $employee = Employee::factory()->create();

        Attendance::factory()->onDate('2026-02-10')->create(['employee_id' => $employee->id]);
        Attendance::factory()->onDate('2026-02-11')->create(['employee_id' => $employee->id]);

        $result = Attendance::byDate('2026-02-10')->get();

        $this->assertCount(1, $result);
        $this->assertEquals('2026-02-10', $result->first()->date->toDateString());
    }

    #[Test]
    public function scope_by_status_filters_by_day_status(): void
    {
        $employee = Employee::factory()->create();

        Attendance::factory()->worked()->onDate('2026-02-10')->create(['employee_id' => $employee->id]);
        Attendance::factory()->absence()->onDate('2026-02-11')->create(['employee_id' => $employee->id]);
        Attendance::factory()->dayOff()->onDate('2026-02-12')->create(['employee_id' => $employee->id]);

        $worked = Attendance::byStatus(DayStatus::WORKED)->get();

        $this->assertCount(1, $worked);
        $this->assertSame(DayStatus::WORKED, $worked->first()->day_status);
    }

    #[Test]
    public function scope_for_employee_filters_by_employee_id(): void
    {
        $employeeA = Employee::factory()->create();
        $employeeB = Employee::factory()->create();

        Attendance::factory()->onDate('2026-02-10')->create(['employee_id' => $employeeA->id]);
        Attendance::factory()->onDate('2026-02-11')->create(['employee_id' => $employeeA->id]);
        Attendance::factory()->onDate('2026-02-10')->create(['employee_id' => $employeeB->id]);

        $result = Attendance::forEmployee($employeeA->id)->get();

        $this->assertCount(2, $result);
        $result->each(fn ($a) => $this->assertEquals($employeeA->id, $a->employee_id));
    }

    // ── Casts & schema ────────────────────────────────────────────────────────

    #[Test]
    public function check_in_and_check_out_are_cast_to_datetime(): void
    {
        $employee   = Employee::factory()->create();
        $attendance = Attendance::factory()->worked()->create(['employee_id' => $employee->id]);

        $attendance->refresh();

        $this->assertInstanceOf(\Illuminate\Support\Carbon::class, $attendance->check_in);
        $this->assertInstanceOf(\Illuminate\Support\Carbon::class, $attendance->check_out);
    }

    #[Test]
    public function date_is_cast_to_carbon(): void
    {
        $employee   = Employee::factory()->create();
        $attendance = Attendance::factory()->onDate('2026-02-15')->create(['employee_id' => $employee->id]);

        $attendance->refresh();

        $this->assertInstanceOf(\Illuminate\Support\Carbon::class, $attendance->date);
        $this->assertEquals('2026-02-15', $attendance->date->toDateString());
    }

    #[Test]
    public function meta_is_cast_to_array(): void
    {
        $employee   = Employee::factory()->create();
        $attendance = Attendance::factory()->create([
            'employee_id' => $employee->id,
            'meta'        => ['source' => 'terminal_01', 'device' => 'fingerprint'],
        ]);

        $attendance->refresh();

        $this->assertIsArray($attendance->meta);
        $this->assertEquals('terminal_01', $attendance->meta['source']);
    }

    #[Test]
    public function overtime_authorized_is_false_by_default(): void
    {
        $employee   = Employee::factory()->create();
        $attendance = Attendance::factory()->create(['employee_id' => $employee->id]);

        $this->assertFalse($attendance->overtime_authorized);
    }

    #[Test]
    public function factory_late_state_sets_entry_late_seconds(): void
    {
        $employee   = Employee::factory()->create();
        $attendance = Attendance::factory()->late(3600)->create(['employee_id' => $employee->id]);

        $this->assertEquals(3600, $attendance->entry_late_seconds);
        $this->assertTrue($attendance->isEntryLateDeductible());
        $this->assertEquals(60, $attendance->entryLateMinutes());
    }
}
