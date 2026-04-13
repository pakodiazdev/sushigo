<?php

namespace Tests\Feature\AttendancePayroll;

use App\Enums\DayStatus;
use App\Models\Attendance;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class MarkDayStatusApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    private const DATE = '2026-04-12';

    protected function setUp(): void
    {
        parent::setUp();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // Position roles required by Employee factory
        Role::firstOrCreate(['name' => 'employee',         'guard_name' => 'api']);
        Role::firstOrCreate(['name' => 'employee-manager', 'guard_name' => 'api']);
        foreach (Employee::POSITION_ROLES as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);
        }

        Role::firstOrCreate(['name' => 'manager', 'guard_name' => 'api']);

        $this->user = User::factory()->create();
        $this->user->assignRole('manager');

        Passport::actingAs($this->user);
    }

    // #region Happy path

    #[Test]
    public function marks_day_as_absence(): void
    {
        $employee = Employee::factory()->create();

        $response = $this->postJson('/api/v1/attendances/day-status', [
            'employee_id' => $employee->public_id,
            'date' => self::DATE,
            'day_status' => 'ABSENCE',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.day_status', 'ABSENCE')
            ->assertJsonPath('data.date', self::DATE)
            ->assertJsonPath('data.check_in', null);

        $this->assertDatabaseHas('attendances', [
            'employee_id' => $employee->id,
            'date' => self::DATE,
            'day_status' => DayStatus::ABSENCE->value,
        ]);
    }

    #[Test]
    public function returns_correct_response_structure(): void
    {
        $employee = Employee::factory()->create();

        $response = $this->postJson('/api/v1/attendances/day-status', [
            'employee_id' => $employee->public_id,
            'date' => self::DATE,
            'day_status' => 'ABSENCE',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'status',
                'data' => [
                    'id',
                    'employee_id',
                    'date',
                    'check_in',
                    'check_out',
                    'day_status',
                    'created_at',
                ],
            ]);

        $this->assertEquals(26, strlen($response->json('data.id')));
        $this->assertEquals($employee->public_id, $response->json('data.employee_id'));
    }

    // #endregion

    // #region 422 error cases

    #[Test]
    public function rejects_day_off_status(): void
    {
        $employee = Employee::factory()->create();

        $response = $this->postJson('/api/v1/attendances/day-status', [
            'employee_id' => $employee->public_id,
            'date' => self::DATE,
            'day_status' => 'DAY_OFF',
        ]);

        $response->assertStatus(422);
        $this->assertArrayHasKey('day_status', $response->json('errors'));
    }

    #[Test]
    public function rejects_duplicate_attendance(): void
    {
        $employee = Employee::factory()->create();

        // First mark succeeds
        $this->postJson('/api/v1/attendances/day-status', [
            'employee_id' => $employee->public_id,
            'date' => self::DATE,
            'day_status' => 'ABSENCE',
        ])->assertStatus(201);

        // Second mark for the same employee/date is rejected
        $response = $this->postJson('/api/v1/attendances/day-status', [
            'employee_id' => $employee->public_id,
            'date' => self::DATE,
            'day_status' => 'ABSENCE',
        ]);

        $response->assertStatus(422);
        $this->assertArrayHasKey('date', $response->json('errors'));
    }

    #[Test]
    public function rejects_duplicate_when_check_in_already_exists(): void
    {
        $employee = Employee::factory()->create();

        // Existing check-in attendance
        Attendance::factory()->create([
            'employee_id' => $employee->id,
            'date' => self::DATE,
            'day_status' => DayStatus::WORKED,
        ]);

        $response = $this->postJson('/api/v1/attendances/day-status', [
            'employee_id' => $employee->public_id,
            'date' => self::DATE,
            'day_status' => 'ABSENCE',
        ]);

        $response->assertStatus(422);
        $this->assertArrayHasKey('date', $response->json('errors'));
    }

    #[Test]
    public function rejects_unknown_employee(): void
    {
        $response = $this->postJson('/api/v1/attendances/day-status', [
            'employee_id' => '01ZZZZZZZZZZZZZZZZZZZZZZZ',
            'date' => self::DATE,
            'day_status' => 'ABSENCE',
        ]);

        $response->assertStatus(422);
        $this->assertArrayHasKey('employee_id', $response->json('errors'));
    }

    #[Test]
    public function rejects_invalid_day_status(): void
    {
        $employee = Employee::factory()->create();

        $response = $this->postJson('/api/v1/attendances/day-status', [
            'employee_id' => $employee->public_id,
            'date' => self::DATE,
            'day_status' => 'WORKED',
        ]);

        $response->assertStatus(422);
        $this->assertArrayHasKey('day_status', $response->json('errors'));
    }

    #[Test]
    public function rejects_invalid_date_format(): void
    {
        $employee = Employee::factory()->create();

        $response = $this->postJson('/api/v1/attendances/day-status', [
            'employee_id' => $employee->public_id,
            'date' => '12/04/2026',
            'day_status' => 'ABSENCE',
        ]);

        $response->assertStatus(422);
        $this->assertArrayHasKey('date', $response->json('errors'));
    }

    #[Test]
    public function rejects_missing_fields(): void
    {
        $response = $this->postJson('/api/v1/attendances/day-status', []);

        $response->assertStatus(422);
        $this->assertArrayHasKey('employee_id', $response->json('errors'));
        $this->assertArrayHasKey('date', $response->json('errors'));
        $this->assertArrayHasKey('day_status', $response->json('errors'));
    }

    // #endregion

    // #region Auth

    #[Test]
    public function rejects_unauthenticated_request(): void
    {
        auth()->forgetGuards();

        $response = $this->postJson('/api/v1/attendances/day-status', [
            'employee_id' => 'any-id',
            'date' => self::DATE,
            'day_status' => 'ABSENCE',
        ]);

        $response->assertStatus(401);
    }

    // #endregion
}
