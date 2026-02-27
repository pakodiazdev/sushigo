<?php

namespace Tests\Feature\AttendancePayroll;

use App\Enums\WorkdayType;
use App\Models\Employee;
use App\Models\EmployeeSchedule;
use App\Models\EmploymentPeriod;
use App\Models\ScheduleDay;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class EmployeeScheduleTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        Role::firstOrCreate(['name' => 'employee',         'guard_name' => 'api']);
        Role::firstOrCreate(['name' => 'employee-manager', 'guard_name' => 'api']);

        foreach (Employee::POSITION_ROLES as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);
        }
    }

    // ── effective() scope ─────────────────────────────────────────────────────

    #[Test]
    public function effective_scope_returns_schedule_whose_range_contains_the_date(): void
    {
        $period = EmploymentPeriod::factory()->create();

        EmployeeSchedule::factory()->effectiveBetween('2026-01-01', '2026-01-31')->create([
            'employment_period_id' => $period->id,
            'workday_type'         => 'FULL',
        ]);

        $result = EmployeeSchedule::effective('2026-01-15')
            ->where('employment_period_id', $period->id)
            ->get();

        $this->assertCount(1, $result);
    }

    #[Test]
    public function effective_scope_returns_open_ended_schedule_for_any_date_after_effective_from(): void
    {
        $period = EmploymentPeriod::factory()->create();

        EmployeeSchedule::factory()->effectiveBetween('2026-01-01', null)->create([
            'employment_period_id' => $period->id,
        ]);

        $result = EmployeeSchedule::effective('2026-12-31')
            ->where('employment_period_id', $period->id)
            ->get();

        $this->assertCount(1, $result);
    }

    #[Test]
    public function effective_scope_excludes_schedule_when_date_is_before_effective_from(): void
    {
        $period = EmploymentPeriod::factory()->create();

        EmployeeSchedule::factory()->effectiveBetween('2026-03-01', null)->create([
            'employment_period_id' => $period->id,
        ]);

        $result = EmployeeSchedule::effective('2026-02-28')
            ->where('employment_period_id', $period->id)
            ->get();

        $this->assertCount(0, $result);
    }

    #[Test]
    public function effective_scope_excludes_schedule_when_date_is_after_effective_to(): void
    {
        $period = EmploymentPeriod::factory()->create();

        EmployeeSchedule::factory()->effectiveBetween('2026-01-01', '2026-01-31')->create([
            'employment_period_id' => $period->id,
        ]);

        $result = EmployeeSchedule::effective('2026-02-01')
            ->where('employment_period_id', $period->id)
            ->get();

        $this->assertCount(0, $result);
    }

    #[Test]
    public function effective_scope_returns_schedule_on_boundary_dates(): void
    {
        $period = EmploymentPeriod::factory()->create();

        EmployeeSchedule::factory()->effectiveBetween('2026-02-01', '2026-02-28')->create([
            'employment_period_id' => $period->id,
        ]);

        $this->assertCount(
            1,
            EmployeeSchedule::effective('2026-02-01')->where('employment_period_id', $period->id)->get()
        );

        $this->assertCount(
            1,
            EmployeeSchedule::effective('2026-02-28')->where('employment_period_id', $period->id)->get()
        );
    }

    #[Test]
    public function effective_scope_returns_only_the_schedule_active_for_the_given_date(): void
    {
        $period = EmploymentPeriod::factory()->create();

        // Jan schedule (closed)
        EmployeeSchedule::factory()->effectiveBetween('2026-01-01', '2026-01-31')->create([
            'employment_period_id' => $period->id,
        ]);

        // Feb schedule (closed)
        EmployeeSchedule::factory()->effectiveBetween('2026-02-01', '2026-02-28')->create([
            'employment_period_id' => $period->id,
        ]);

        // Mar+ schedule (active)
        EmployeeSchedule::factory()->effectiveBetween('2026-03-01', null)->create([
            'employment_period_id' => $period->id,
        ]);

        $result = EmployeeSchedule::effective('2026-02-15')
            ->where('employment_period_id', $period->id)
            ->get();

        $this->assertCount(1, $result);
        $this->assertEquals('2026-02-01', $result->first()->effective_from->toDateString());
    }

    // ── dayConfig() ───────────────────────────────────────────────────────────

    #[Test]
    public function dayConfig_returns_schedule_day_for_configured_day_of_week(): void
    {
        $schedule = EmployeeSchedule::factory()->create();

        ScheduleDay::factory()->monday()->create([
            'employee_schedule_id' => $schedule->id,
        ]);

        $day = $schedule->dayConfig(1); // Monday

        $this->assertNotNull($day);
        $this->assertEquals(1, $day->day_of_week);
    }

    #[Test]
    public function dayConfig_returns_null_for_unconfigured_day_of_week(): void
    {
        $schedule = EmployeeSchedule::factory()->create();

        // Only configure Monday (1), query for Sunday (7)
        ScheduleDay::factory()->monday()->create([
            'employee_schedule_id' => $schedule->id,
        ]);

        $this->assertNull($schedule->dayConfig(7));
    }

    // ── workingDays() ─────────────────────────────────────────────────────────

    #[Test]
    public function workingDays_returns_only_non_day_off_days(): void
    {
        $schedule = EmployeeSchedule::factory()->create();

        // Mon–Fri as working days
        foreach ([1, 2, 3, 4, 5] as $dow) {
            ScheduleDay::factory()->workDay()->onDayOfWeek($dow)->create([
                'employee_schedule_id' => $schedule->id,
            ]);
        }

        // Sat and Sun as days off
        foreach ([6, 7] as $dow) {
            ScheduleDay::factory()->dayOff()->onDayOfWeek($dow)->create([
                'employee_schedule_id' => $schedule->id,
            ]);
        }

        $working = $schedule->workingDays();

        $this->assertCount(5, $working);
        $this->assertTrue($working->every(fn ($d) => ! $d->is_day_off));
    }

    // ── Uniqueness constraints ────────────────────────────────────────────────

    #[Test]
    public function cannot_create_duplicate_schedule_day_for_same_day_of_week(): void
    {
        $schedule = EmployeeSchedule::factory()->create();

        ScheduleDay::factory()->monday()->create(['employee_schedule_id' => $schedule->id]);

        $this->expectException(UniqueConstraintViolationException::class);

        ScheduleDay::factory()->monday()->create(['employee_schedule_id' => $schedule->id]);
    }

    #[Test]
    public function cannot_create_two_active_schedules_for_the_same_employment_period(): void
    {
        $period = EmploymentPeriod::factory()->create();

        // First active (open-ended) schedule
        EmployeeSchedule::factory()->current()->create(['employment_period_id' => $period->id]);

        // Second active schedule for the same period — should violate partial unique index
        $this->expectException(UniqueConstraintViolationException::class);

        EmployeeSchedule::factory()->current()->create(['employment_period_id' => $period->id]);
    }

    #[Test]
    public function two_closed_schedules_for_same_period_are_allowed(): void
    {
        $period = EmploymentPeriod::factory()->create();

        EmployeeSchedule::factory()->effectiveBetween('2025-01-01', '2025-06-30')->create([
            'employment_period_id' => $period->id,
        ]);

        EmployeeSchedule::factory()->effectiveBetween('2025-07-01', '2025-12-31')->create([
            'employment_period_id' => $period->id,
        ]);

        $this->assertCount(2, EmployeeSchedule::where('employment_period_id', $period->id)->get());
    }

    // ── ScheduleDay::isDayOff() ───────────────────────────────────────────────

    #[Test]
    public function isDayOff_returns_true_when_is_day_off_is_true(): void
    {
        $schedule = EmployeeSchedule::factory()->create();
        $day      = ScheduleDay::factory()->dayOff()->sunday()->create([
            'employee_schedule_id' => $schedule->id,
        ]);

        $this->assertTrue($day->isDayOff());
    }

    #[Test]
    public function isDayOff_returns_false_for_regular_working_day(): void
    {
        $schedule = EmployeeSchedule::factory()->create();
        $day      = ScheduleDay::factory()->workDay()->monday()->create([
            'employee_schedule_id' => $schedule->id,
        ]);

        $this->assertFalse($day->isDayOff());
    }

    // ── ScheduleDay::expectedDurationMinutes() ────────────────────────────────

    #[Test]
    public function expectedDurationMinutes_returns_zero_for_day_off(): void
    {
        $schedule = EmployeeSchedule::factory()->create();
        $day      = ScheduleDay::factory()->dayOff()->sunday()->create([
            'employee_schedule_id' => $schedule->id,
        ]);

        $this->assertSame(0, $day->expectedDurationMinutes());
    }

    #[Test]
    public function expectedDurationMinutes_returns_null_when_time_fields_are_missing(): void
    {
        $schedule = EmployeeSchedule::factory()->create();
        $day      = ScheduleDay::factory()->workDay()->monday()->create([
            'employee_schedule_id' => $schedule->id,
            'expected_start'       => null,
            'expected_end'         => null,
        ]);

        $this->assertNull($day->expectedDurationMinutes());
    }

    #[Test]
    public function expectedDurationMinutes_calculates_gross_duration_without_lunch(): void
    {
        // 08:00 → 17:00 = 540 minutes, no lunch configured
        $schedule = EmployeeSchedule::factory()->create();
        $day      = ScheduleDay::factory()->workDay()->monday()->withTimes(
            start:      '08:00:00',
            lunchStart: null,
            lunchEnd:   null,
            end:        '17:00:00',
        )->create(['employee_schedule_id' => $schedule->id]);

        $this->assertSame(540, $day->expectedDurationMinutes());
    }

    #[Test]
    public function expectedDurationMinutes_subtracts_lunch_break_when_both_boundaries_are_set(): void
    {
        // 08:00 → 17:00 = 540 min, lunch 13:00 → 14:00 = 60 min → net 480 min
        $schedule = EmployeeSchedule::factory()->create();
        $day      = ScheduleDay::factory()->workDay()->monday()->withTimes(
            start:      '08:00:00',
            lunchStart: '13:00:00',
            lunchEnd:   '14:00:00',
            end:        '17:00:00',
        )->create(['employee_schedule_id' => $schedule->id]);

        $this->assertSame(480, $day->expectedDurationMinutes());
    }

    #[Test]
    public function expectedDurationMinutes_ignores_partial_lunch_when_one_boundary_is_missing(): void
    {
        // Only lunch_start provided, no lunch_end → no deduction
        // 08:00 → 17:00 = 540 min gross
        $schedule = EmployeeSchedule::factory()->create();
        $day      = ScheduleDay::factory()->workDay()->monday()->withTimes(
            start:      '08:00:00',
            lunchStart: '13:00:00',
            lunchEnd:   null,
            end:        '17:00:00',
        )->create(['employee_schedule_id' => $schedule->id]);

        $this->assertSame(540, $day->expectedDurationMinutes());
    }

    // ── Relationships ─────────────────────────────────────────────────────────

    #[Test]
    public function employee_schedule_belongs_to_employment_period(): void
    {
        $period   = EmploymentPeriod::factory()->create();
        $schedule = EmployeeSchedule::factory()->create(['employment_period_id' => $period->id]);

        $this->assertEquals($period->id, $schedule->employmentPeriod->id);
    }

    #[Test]
    public function employee_schedule_has_many_schedule_days(): void
    {
        $schedule = EmployeeSchedule::factory()->create();

        ScheduleDay::factory()->monday()->create(['employee_schedule_id' => $schedule->id]);
        ScheduleDay::factory()->tuesday()->create(['employee_schedule_id' => $schedule->id]);

        $this->assertCount(2, $schedule->scheduleDays);
    }

    #[Test]
    public function schedule_days_are_ordered_by_day_of_week(): void
    {
        $schedule = EmployeeSchedule::factory()->create();

        // Create in reverse order
        ScheduleDay::factory()->friday()->create(['employee_schedule_id' => $schedule->id]);
        ScheduleDay::factory()->monday()->create(['employee_schedule_id' => $schedule->id]);
        ScheduleDay::factory()->wednesday()->create(['employee_schedule_id' => $schedule->id]);

        $days = $schedule->scheduleDays;

        $this->assertEquals([1, 3, 5], $days->pluck('day_of_week')->toArray());
    }

    #[Test]
    public function employment_period_has_many_employee_schedules(): void
    {
        $period = EmploymentPeriod::factory()->create();

        EmployeeSchedule::factory()->effectiveBetween('2025-01-01', '2025-06-30')->create([
            'employment_period_id' => $period->id,
        ]);

        EmployeeSchedule::factory()->effectiveBetween('2025-07-01', null)->create([
            'employment_period_id' => $period->id,
        ]);

        $this->assertCount(2, $period->employeeSchedules);
    }

    #[Test]
    public function schedule_day_belongs_to_employee_schedule(): void
    {
        $schedule = EmployeeSchedule::factory()->create();
        $day      = ScheduleDay::factory()->monday()->create([
            'employee_schedule_id' => $schedule->id,
        ]);

        $this->assertEquals($schedule->id, $day->employeeSchedule->id);
    }

    // ── Casts & schema ────────────────────────────────────────────────────────

    #[Test]
    public function workday_type_is_cast_to_enum(): void
    {
        $schedule = EmployeeSchedule::factory()->full()->create();

        $this->assertInstanceOf(WorkdayType::class, $schedule->workday_type);
        $this->assertSame(WorkdayType::FULL, $schedule->workday_type);
    }

    #[Test]
    public function effective_from_and_to_are_cast_to_date(): void
    {
        $schedule = EmployeeSchedule::factory()
            ->effectiveBetween('2026-01-01', '2026-06-30')
            ->create();

        $this->assertInstanceOf(Carbon::class, $schedule->effective_from);
        $this->assertInstanceOf(Carbon::class, $schedule->effective_to);
    }

    #[Test]
    public function null_effective_to_means_currently_active(): void
    {
        $schedule = EmployeeSchedule::factory()->current()->create();

        $this->assertNull($schedule->effective_to);
    }

    #[Test]
    public function it_generates_ulid_public_id_on_create(): void
    {
        $schedule = EmployeeSchedule::factory()->create();

        $this->assertNotNull($schedule->public_id);
        $this->assertEquals(26, strlen($schedule->public_id));
    }

    #[Test]
    public function it_can_be_soft_deleted(): void
    {
        $schedule = EmployeeSchedule::factory()->create();

        $schedule->delete();

        $this->assertSoftDeleted($schedule);
        $this->assertNull(EmployeeSchedule::find($schedule->id));
        $this->assertNotNull(EmployeeSchedule::withTrashed()->find($schedule->id));
    }
}
