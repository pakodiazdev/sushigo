<?php

namespace Tests\Feature\AttendancePayroll;

use App\Models\Employee;
use App\Models\EmployeeSchedule;
use App\Models\EmploymentPeriod;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class CreateScheduleApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected EmploymentPeriod $period;

    protected function setUp(): void
    {
        parent::setUp();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        Permission::create(['name' => 'employees.update', 'guard_name' => 'api']);

        $role = Role::create(['name' => 'admin', 'guard_name' => 'api']);
        $role->givePermissionTo('employees.update');

        foreach (Employee::POSITION_ROLES as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);
        }

        $this->admin = User::factory()->create();
        $this->admin->assignRole('admin');

        Passport::actingAs($this->admin);

        $this->period = EmploymentPeriod::factory()->create();
    }

    private function validPayload(array $overrides = []): array
    {
        $days = collect(range(1, 7))->map(fn ($dow) => [
            'day_of_week' => $dow,
            'is_day_off' => $dow >= 6, // Sat & Sun off
            'expected_start' => $dow < 6 ? '08:00' : null,
            'expected_lunch_start' => $dow < 6 ? '13:00' : null,
            'expected_lunch_end' => $dow < 6 ? '14:00' : null,
            'lunch_duration_minutes' => $dow < 6 ? 60 : null,
            'expected_end' => $dow < 6 ? '17:00' : null,
        ])->toArray();

        return array_merge([
            'effective_from' => '2026-03-01',
            'workday_type' => 'FULL',
            'working_days_per_week' => 5,
            'days' => $days,
        ], $overrides);
    }

    #[Test]
    public function admin_can_create_a_schedule_with_7_days(): void
    {
        $response = $this->postJson(
            "/api/v1/employment-periods/{$this->period->public_id}/schedules",
            $this->validPayload()
        );

        $response->assertStatus(201)
            ->assertJsonPath('data.workday_type', 'FULL')
            ->assertJsonPath('data.working_days_per_week', 5)
            ->assertJsonCount(7, 'data.days');

        $this->assertDatabaseHas('employee_schedules', [
            'employment_period_id' => $this->period->id,
            'effective_from' => '2026-03-01',
            'effective_to' => null,
        ]);

        $this->assertDatabaseCount('schedule_days', 7);
    }

    #[Test]
    public function creating_a_new_schedule_auto_closes_the_previous_one(): void
    {
        $previous = EmployeeSchedule::factory()->create([
            'employment_period_id' => $this->period->id,
            'effective_from' => '2026-01-01',
            'effective_to' => null,
        ]);

        $this->postJson(
            "/api/v1/employment-periods/{$this->period->public_id}/schedules",
            $this->validPayload(['effective_from' => '2026-03-01'])
        )->assertStatus(201);

        $this->assertDatabaseHas('employee_schedules', [
            'id' => $previous->id,
            'effective_to' => '2026-02-28',
        ]);
    }

    #[Test]
    public function validation_rejects_when_a_working_day_is_missing_expected_start(): void
    {
        $days = collect(range(1, 7))->map(fn ($dow) => [
            'day_of_week' => $dow,
            'is_day_off' => false,
            'expected_start' => null, // missing for all days
            'expected_end' => '17:00',
        ])->toArray();

        $response = $this->postJson(
            "/api/v1/employment-periods/{$this->period->public_id}/schedules",
            $this->validPayload(['days' => $days])
        );

        $response->assertStatus(422);
        $this->assertArrayHasKey('days.0.expected_start', $response->json('errors'));
    }

    #[Test]
    public function validation_rejects_when_a_working_day_is_missing_expected_end(): void
    {
        $days = collect(range(1, 7))->map(fn ($dow) => [
            'day_of_week' => $dow,
            'is_day_off' => false,
            'expected_start' => '09:00',
            'expected_end' => null,
        ])->toArray();

        $response = $this->postJson(
            "/api/v1/employment-periods/{$this->period->public_id}/schedules",
            $this->validPayload(['days' => $days])
        );

        $response->assertStatus(422);
        $this->assertArrayHasKey('days.0.expected_end', $response->json('errors'));
    }

    #[Test]
    public function validation_rejects_duplicate_day_of_week(): void
    {
        $payload = $this->validPayload();
        $payload['days'][1]['day_of_week'] = 1; // duplicate Monday

        $response = $this->postJson(
            "/api/v1/employment-periods/{$this->period->public_id}/schedules",
            $payload
        );

        $response->assertStatus(422);
        $this->assertArrayHasKey('days.1.day_of_week', $response->json('errors'));
    }

    #[Test]
    public function validation_rejects_when_days_array_has_less_than_7_entries(): void
    {
        $payload = $this->validPayload();
        $payload['days'] = array_slice($payload['days'], 0, 5);

        $response = $this->postJson(
            "/api/v1/employment-periods/{$this->period->public_id}/schedules",
            $payload
        );

        $response->assertStatus(422);
        $this->assertArrayHasKey('days', $response->json('errors'));
    }

    #[Test]
    public function returns_404_for_nonexistent_employment_period(): void
    {
        $response = $this->postJson(
            '/api/v1/employment-periods/nonexistent-ulid/schedules',
            $this->validPayload()
        );

        $response->assertStatus(404);
    }

    #[Test]
    public function unauthenticated_request_returns_401(): void
    {
        // Reset the guard set by setUp so the request carries no token
        app('auth')->forgetGuards();

        $response = $this->postJson(
            "/api/v1/employment-periods/{$this->period->public_id}/schedules",
            $this->validPayload()
        );

        $response->assertStatus(401);
    }

    #[Test]
    public function user_without_permission_returns_403(): void
    {
        $user = User::factory()->create(); // fresh user with no permissions
        Passport::actingAs($user);

        $response = $this->postJson(
            "/api/v1/employment-periods/{$this->period->public_id}/schedules",
            $this->validPayload()
        );

        $response->assertStatus(403);
    }

    #[Test]
    public function validation_rejects_effective_from_same_as_existing_open_ended_schedule(): void
    {
        EmployeeSchedule::factory()->create([
            'employment_period_id' => $this->period->id,
            'effective_from' => '2026-03-01',
            'effective_to' => null,
        ]);

        $response = $this->postJson(
            "/api/v1/employment-periods/{$this->period->public_id}/schedules",
            $this->validPayload(['effective_from' => '2026-03-01'])
        );

        $response->assertStatus(422);
        $this->assertArrayHasKey('effective_from', $response->json('errors'));
    }

    #[Test]
    public function validation_rejects_effective_from_before_existing_open_ended_schedule(): void
    {
        EmployeeSchedule::factory()->create([
            'employment_period_id' => $this->period->id,
            'effective_from' => '2026-03-15',
            'effective_to' => null,
        ]);

        $response = $this->postJson(
            "/api/v1/employment-periods/{$this->period->public_id}/schedules",
            $this->validPayload(['effective_from' => '2026-03-01'])
        );

        $response->assertStatus(422);
        $this->assertArrayHasKey('effective_from', $response->json('errors'));
    }
}
