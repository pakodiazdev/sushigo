<?php

namespace Tests\Feature\AttendancePayroll;

use App\Models\Attendance;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class LunchStartApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    /** Monday 2026-02-23 — same date used across all tests */
    private const DATE        = '2026-02-23';
    private const CHECK_IN    = '2026-02-23T09:00:00';
    private const LUNCH_START = '2026-02-23T13:05:00';

    protected function setUp(): void
    {
        parent::setUp();

        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        Permission::create(['name' => 'attendances.create', 'guard_name' => 'api']);
        $role = Role::create(['name' => 'manager', 'guard_name' => 'api']);
        $role->givePermissionTo('attendances.create');

        // Position roles required by Employee factory
        Role::firstOrCreate(['name' => 'employee',         'guard_name' => 'api']);
        Role::firstOrCreate(['name' => 'employee-manager', 'guard_name' => 'api']);
        foreach (Employee::POSITION_ROLES as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);
        }

        $this->user = User::factory()->create();
        $this->user->assignRole('manager');

        Passport::actingAs($this->user);
    }

    // ── Happy path ────────────────────────────────────────────────────────────

    #[Test]
    public function registers_lunch_start_successfully(): void
    {
        $attendance = $this->makeAttendanceWithCheckIn();

        $response = $this->patchJson(
            "/api/v1/attendances/{$attendance->public_id}/lunch-start",
            ['lunch_start' => self::LUNCH_START],
        );

        $response->assertStatus(200)
            ->assertJsonPath('data.lunch_start', self::LUNCH_START . '+00:00');
    }

    #[Test]
    public function lunch_start_is_stored_in_database(): void
    {
        $attendance = $this->makeAttendanceWithCheckIn();

        $this->patchJson(
            "/api/v1/attendances/{$attendance->public_id}/lunch-start",
            ['lunch_start' => self::LUNCH_START],
        )->assertStatus(200);

        $this->assertDatabaseHas('attendances', [
            'id'          => $attendance->id,
            'lunch_start' => '2026-02-23 13:05:00',
        ]);
    }

    #[Test]
    public function returns_correct_response_structure(): void
    {
        $attendance = $this->makeAttendanceWithCheckIn();

        $response = $this->patchJson(
            "/api/v1/attendances/{$attendance->public_id}/lunch-start",
            ['lunch_start' => self::LUNCH_START],
        );

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'data' => [
                    'id',
                    'employee_id',
                    'date',
                    'check_in',
                    'lunch_start',
                    'entry_late_seconds',
                    'lunch_late_seconds',
                    'day_status',
                    'created_at',
                ],
            ]);

        $this->assertEquals(26, strlen($response->json('data.id')));
    }

    // ── 422 error cases ───────────────────────────────────────────────────────

    #[Test]
    public function rejects_when_no_check_in_registered(): void
    {
        // Attendance exists but has no check_in (e.g. day_off or absence row)
        $employee   = Employee::factory()->create();
        $attendance = Attendance::factory()->onDate(self::DATE)->create([
            'employee_id' => $employee->id,
            'check_in'    => null,
        ]);

        $response = $this->patchJson(
            "/api/v1/attendances/{$attendance->public_id}/lunch-start",
            ['lunch_start' => self::LUNCH_START],
        );

        $response->assertStatus(422);
        $this->assertArrayHasKey('lunch_start', $response->json('errors'));
    }

    #[Test]
    public function rejects_duplicate_lunch_start(): void
    {
        $attendance = $this->makeAttendanceWithCheckIn();

        $this->patchJson(
            "/api/v1/attendances/{$attendance->public_id}/lunch-start",
            ['lunch_start' => self::LUNCH_START],
        )->assertStatus(200);

        $response = $this->patchJson(
            "/api/v1/attendances/{$attendance->public_id}/lunch-start",
            ['lunch_start' => self::LUNCH_START],
        );

        $response->assertStatus(422);
        $this->assertArrayHasKey('lunch_start', $response->json('errors'));
    }

    #[Test]
    public function rejects_invalid_attendance_id(): void
    {
        $response = $this->patchJson(
            '/api/v1/attendances/nonexistent-ulid-abc/lunch-start',
            ['lunch_start' => self::LUNCH_START],
        );

        $response->assertStatus(404);
    }

    #[Test]
    public function rejects_invalid_datetime_format(): void
    {
        $attendance = $this->makeAttendanceWithCheckIn();

        $response = $this->patchJson(
            "/api/v1/attendances/{$attendance->public_id}/lunch-start",
            ['lunch_start' => '23/02/2026 13:05'],  // wrong format
        );

        $response->assertStatus(422);
        $this->assertArrayHasKey('lunch_start', $response->json('errors'));
    }

    // ── Auth ──────────────────────────────────────────────────────────────────

    #[Test]
    public function rejects_unauthenticated_request(): void
    {
        $attendance = $this->makeAttendanceWithCheckIn();

        auth()->forgetGuards();

        $response = $this->patchJson(
            "/api/v1/attendances/{$attendance->public_id}/lunch-start",
            ['lunch_start' => self::LUNCH_START],
        );

        $response->assertStatus(401);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Create an attendance record that already has a check_in but no lunch_start.
     */
    private function makeAttendanceWithCheckIn(): Attendance
    {
        $employee = Employee::factory()->create();

        return Attendance::factory()->onDate(self::DATE)->create([
            'employee_id' => $employee->id,
            'check_in'    => self::CHECK_IN,
            'lunch_start' => null,
        ]);
    }
}
