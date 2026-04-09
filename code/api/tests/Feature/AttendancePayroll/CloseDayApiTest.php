<?php

namespace Tests\Feature\AttendancePayroll;

use App\Models\Attendance;
use App\Models\Employee;
use App\Models\EmployeeSchedule;
use App\Models\EmploymentPeriod;
use App\Models\ScheduleDay;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class CloseDayApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected int $branchId;

    /**
     * Monday 2026-02-23.
     * Schedule: 09:00 → 17:00, 60-min lunch.
     */
    private const DATE = '2026-02-23';

    private const CHECK_IN = '2026-02-23T09:00:00';

    private const LUNCH_START = '2026-02-23T13:00:00';

    private const LUNCH_END = '2026-02-23T14:00:00';

    protected function setUp(): void
    {
        parent::setUp();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        Permission::create(['name' => 'attendances.create', 'guard_name' => 'api']);
        $role = Role::create(['name' => 'manager', 'guard_name' => 'api']);
        $role->givePermissionTo('attendances.create');

        Role::firstOrCreate(['name' => 'employee', 'guard_name' => 'api']);
        Role::firstOrCreate(['name' => 'employee-manager', 'guard_name' => 'api']);
        foreach (Employee::POSITION_ROLES as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);
        }

        $this->user = User::factory()->create();
        $this->user->assignRole('manager');

        Passport::actingAs($this->user);

        // Fix "today" to match the test date so CloseDayAction finds attendances
        Carbon::setTestNow(Carbon::parse(self::DATE.' 22:00:00', config('app.business_timezone')));
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    // #region Happy path

    #[Test]
    public function closes_day_with_check_outs_and_absences(): void
    {
        // 2 employees returned from lunch (ready for check-out), 1 never checked in (absence)
        ['employee' => $emp1] = $this->makeReturnedEmployee();
        ['employee' => $emp2] = $this->makeReturnedEmployee();
        $this->makeEmployeeWithSchedule(); // no attendance → absence

        $response = $this->postJson('/api/v1/attendances/close-day', [
            'branch_id' => $this->branchId,
            'close_time' => '22:00',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.lunch_returns', 0)
            ->assertJsonPath('data.check_outs', 2)
            ->assertJsonPath('data.absences', 1);

        // Verify check-outs were registered
        $this->assertNotNull(Attendance::where('employee_id', $emp1->id)->first()->check_out);
        $this->assertNotNull(Attendance::where('employee_id', $emp2->id)->first()->check_out);
    }

    #[Test]
    public function closes_day_with_pending_lunch_returns(): void
    {
        // 1 employee at lunch (pending return), 1 returned
        ['attendance' => $atLunchAtt, 'employee' => $atLunchEmp] = $this->makeAtLunchEmployee();
        ['employee' => $returnedEmp] = $this->makeReturnedEmployee();

        $response = $this->postJson('/api/v1/attendances/close-day', [
            'branch_id' => $this->branchId,
            'close_time' => '22:00',
            'lunch_returns' => [
                [
                    'attendance_id' => $atLunchAtt->public_id,
                    'lunch_end' => '15:00',
                ],
            ],
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.lunch_returns', 1)
            ->assertJsonPath('data.check_outs', 2)
            ->assertJsonPath('data.absences', 0);

        // Verify lunch return was registered
        $atLunchAtt->refresh();
        $this->assertNotNull($atLunchAtt->lunch_end);
        $this->assertNotNull($atLunchAtt->check_out);
    }

    #[Test]
    public function closes_day_marks_absences_for_employees_without_attendance(): void
    {
        // 3 employees, none checked in → all absences
        $this->makeEmployeeWithSchedule();
        $this->makeEmployeeWithSchedule();
        $this->makeEmployeeWithSchedule();

        $response = $this->postJson('/api/v1/attendances/close-day', [
            'branch_id' => $this->branchId,
            'close_time' => '22:00',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.lunch_returns', 0)
            ->assertJsonPath('data.check_outs', 0)
            ->assertJsonPath('data.absences', 3);

        // Verify absence records created
        $this->assertDatabaseCount('attendances', 3);
        $this->assertEquals(3, Attendance::where('day_status', 'ABSENCE')->count());
    }

    #[Test]
    public function closes_day_with_only_check_outs_no_absences(): void
    {
        // All employees have attendance → only check-outs
        $this->makeReturnedEmployee();

        $response = $this->postJson('/api/v1/attendances/close-day', [
            'branch_id' => $this->branchId,
            'close_time' => '17:00',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.check_outs', 1)
            ->assertJsonPath('data.absences', 0);
    }

    #[Test]
    public function returns_correct_response_structure(): void
    {
        $this->makeReturnedEmployee();

        $response = $this->postJson('/api/v1/attendances/close-day', [
            'branch_id' => $this->branchId,
            'close_time' => '22:00',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'data' => [
                    'lunch_returns',
                    'check_outs',
                    'absences',
                ],
            ]);
    }

    #[Test]
    public function skips_employees_still_at_lunch_without_lunch_return_data(): void
    {
        // Employee at lunch, but NOT included in lunch_returns → should NOT get check-out
        ['employee' => $atLunchEmp] = $this->makeAtLunchEmployee();

        $response = $this->postJson('/api/v1/attendances/close-day', [
            'branch_id' => $this->branchId,
            'close_time' => '22:00',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.check_outs', 0)
            ->assertJsonPath('data.lunch_returns', 0);

        // Employee should still be at lunch (no check-out)
        $att = Attendance::where('employee_id', $atLunchEmp->id)->first();
        $this->assertNull($att->check_out);
        $this->assertNull($att->lunch_end);
    }

    #[Test]
    public function does_not_double_checkout_already_done_employees(): void
    {
        // Employee already checked out → should not be affected
        ['employee' => $employee] = $this->makeDoneEmployee();

        $response = $this->postJson('/api/v1/attendances/close-day', [
            'branch_id' => $this->branchId,
            'close_time' => '22:00',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.check_outs', 0)
            ->assertJsonPath('data.absences', 0);
    }

    // #endregion

    // #region Validation errors (422)

    #[Test]
    public function rejects_missing_branch_id(): void
    {
        $response = $this->postJson('/api/v1/attendances/close-day', [
            'close_time' => '22:00',
        ]);

        $response->assertStatus(422);
        $this->assertArrayHasKey('branch_id', $response->json('errors'));
    }

    #[Test]
    public function rejects_missing_close_time(): void
    {
        $response = $this->postJson('/api/v1/attendances/close-day', [
            'branch_id' => $this->branchId ?? 1,
        ]);

        $response->assertStatus(422);
        $this->assertArrayHasKey('close_time', $response->json('errors'));
    }

    #[Test]
    public function rejects_invalid_close_time_format(): void
    {
        $this->makeEmployeeWithSchedule();

        $response = $this->postJson('/api/v1/attendances/close-day', [
            'branch_id' => $this->branchId,
            'close_time' => '2026-02-23T22:00:00',
        ]);

        $response->assertStatus(422);
        $this->assertArrayHasKey('close_time', $response->json('errors'));
    }

    #[Test]
    public function rejects_nonexistent_branch(): void
    {
        $response = $this->postJson('/api/v1/attendances/close-day', [
            'branch_id' => 99999,
            'close_time' => '22:00',
        ]);

        $response->assertStatus(422);
        $this->assertArrayHasKey('branch_id', $response->json('errors'));
    }

    #[Test]
    public function rejects_invalid_attendance_id_in_lunch_returns(): void
    {
        $this->makeEmployeeWithSchedule();

        $response = $this->postJson('/api/v1/attendances/close-day', [
            'branch_id' => $this->branchId,
            'close_time' => '22:00',
            'lunch_returns' => [
                ['attendance_id' => 'nonexistent-id', 'lunch_end' => '15:00'],
            ],
        ]);

        $response->assertStatus(422);
    }

    #[Test]
    public function rejects_duplicate_attendance_ids_in_lunch_returns(): void
    {
        ['attendance' => $att] = $this->makeAtLunchEmployee();

        $response = $this->postJson('/api/v1/attendances/close-day', [
            'branch_id' => $this->branchId,
            'close_time' => '22:00',
            'lunch_returns' => [
                ['attendance_id' => $att->public_id, 'lunch_end' => '15:00'],
                ['attendance_id' => $att->public_id, 'lunch_end' => '15:30'],
            ],
        ]);

        $response->assertStatus(422);
    }

    // #endregion

    // #region Auth

    #[Test]
    public function unauthenticated_user_gets_401(): void
    {
        auth()->forgetGuards();

        $response = $this->postJson('/api/v1/attendances/close-day', [
            'branch_id' => 1,
            'close_time' => '22:00',
        ]);

        $response->assertStatus(401);
    }

    // #endregion

    // #region Helpers

    /**
     * Create an employee with active period + schedule for Monday.
     * Stores branchId on first call for reuse.
     */
    private function makeEmployeeWithSchedule(): array
    {
        $period = EmploymentPeriod::factory()->create([
            'is_active' => true,
            'start_date' => '2026-01-01',
        ]);

        // Ensure all employees share the same branch
        if (! isset($this->branchId)) {
            $this->branchId = $period->branch_id;
        } else {
            $period->update(['branch_id' => $this->branchId]);
        }

        $employee = $period->employee;

        $schedule = EmployeeSchedule::factory()->current()->create([
            'employment_period_id' => $period->id,
            'effective_from' => '2026-01-01',
        ]);

        ScheduleDay::factory()
            ->workDay()
            ->monday()
            ->withTimes(start: '09:00:00', end: '17:00:00')
            ->withLunchDuration(60)
            ->create(['employee_schedule_id' => $schedule->id]);

        return compact('employee', 'period', 'schedule');
    }

    /**
     * Employee with check-in + lunch + return, no check-out → "returned" phase.
     */
    private function makeReturnedEmployee(): array
    {
        ['employee' => $employee, 'period' => $period, 'schedule' => $schedule] = $this->makeEmployeeWithSchedule();

        $attendance = Attendance::factory()->onDate(self::DATE)->create([
            'employee_id' => $employee->id,
            'check_in' => self::CHECK_IN,
            'lunch_start' => self::LUNCH_START,
            'lunch_end' => self::LUNCH_END,
            'check_out' => null,
        ]);

        return compact('attendance', 'employee', 'schedule');
    }

    /**
     * Employee with check-in + lunch-start, no return → "at-lunch" phase.
     */
    private function makeAtLunchEmployee(): array
    {
        ['employee' => $employee, 'period' => $period, 'schedule' => $schedule] = $this->makeEmployeeWithSchedule();

        $attendance = Attendance::factory()->onDate(self::DATE)->create([
            'employee_id' => $employee->id,
            'check_in' => self::CHECK_IN,
            'lunch_start' => self::LUNCH_START,
            'lunch_end' => null,
            'check_out' => null,
        ]);

        return compact('attendance', 'employee', 'schedule');
    }

    /**
     * Employee with complete attendance (already checked out) → "done" phase.
     */
    private function makeDoneEmployee(): array
    {
        ['employee' => $employee, 'period' => $period, 'schedule' => $schedule] = $this->makeEmployeeWithSchedule();

        $attendance = Attendance::factory()->onDate(self::DATE)->create([
            'employee_id' => $employee->id,
            'check_in' => self::CHECK_IN,
            'lunch_start' => self::LUNCH_START,
            'lunch_end' => self::LUNCH_END,
            'check_out' => '2026-02-23T17:00:00',
            'net_worked_minutes' => 420,
        ]);

        return compact('attendance', 'employee', 'schedule');
    }

    // #endregion
}
