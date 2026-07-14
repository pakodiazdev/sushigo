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

class UpdateScheduleApiTest extends TestCase
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

    private function makeActiveSchedule(array $overrides = []): EmployeeSchedule
    {
        $schedule = EmployeeSchedule::factory()->create(array_merge([
            'employment_period_id' => $this->period->id,
            'effective_from' => '2026-01-01',
            'effective_to' => null,
            'workday_type' => 'FULL',
            'working_days_per_week' => 5,
        ], $overrides));

        collect(range(1, 7))->each(fn ($dow) => $schedule->scheduleDays()->create([
            'day_of_week' => $dow,
            'is_day_off' => $dow >= 6,
            'expected_start' => $dow < 6 ? '08:00' : null,
            'expected_lunch_start' => $dow < 6 ? '13:00' : null,
            'expected_lunch_end' => $dow < 6 ? '14:00' : null,
            'lunch_duration_minutes' => $dow < 6 ? 60 : null,
            'expected_end' => $dow < 6 ? '17:00' : null,
        ]));

        return $schedule;
    }

    private function validPayload(array $overrides = []): array
    {
        $days = collect(range(1, 7))->map(fn ($dow) => [
            'day_of_week' => $dow,
            'is_day_off' => $dow >= 6,
            'expected_start' => $dow < 6 ? '09:00' : null,
            'expected_lunch_start' => $dow < 6 ? '13:30' : null,
            'expected_lunch_end' => $dow < 6 ? '14:30' : null,
            'lunch_duration_minutes' => $dow < 6 ? 60 : null,
            'expected_end' => $dow < 6 ? '18:00' : null,
        ])->toArray();

        return array_merge([
            'effective_from' => '2026-01-01',
            'workday_type' => 'FULL',
            'working_days_per_week' => 5,
            'days' => $days,
        ], $overrides);
    }

    #[Test]
    public function admin_can_update_the_active_schedule(): void
    {
        $schedule = $this->makeActiveSchedule();

        $response = $this->putJson(
            "/api/v1/schedules/{$schedule->public_id}",
            $this->validPayload()
        );

        $response->assertStatus(200)
            ->assertJsonPath('data.id', $schedule->public_id)
            ->assertJsonPath('data.days.0.expected_start', '09:00')
            ->assertJsonCount(7, 'data.days');

        $this->assertDatabaseHas('employee_schedules', [
            'id' => $schedule->id,
            'effective_to' => null,
        ]);

        $this->assertDatabaseCount('schedule_days', 7);
        $this->assertDatabaseHas('schedule_days', [
            'employee_schedule_id' => $schedule->id,
            'day_of_week' => 1,
            'expected_start' => '09:00:00',
        ]);
    }

    #[Test]
    public function updating_replaces_the_previous_day_configuration(): void
    {
        $schedule = $this->makeActiveSchedule();

        $this->putJson(
            "/api/v1/schedules/{$schedule->public_id}",
            $this->validPayload(['working_days_per_week' => 6, 'days' => collect(range(1, 7))->map(fn ($dow) => [
                'day_of_week' => $dow,
                'is_day_off' => $dow === 7,
                'expected_start' => $dow === 7 ? null : '10:00',
                'expected_lunch_start' => null,
                'expected_lunch_end' => null,
                'lunch_duration_minutes' => null,
                'expected_end' => $dow === 7 ? null : '19:00',
            ])->toArray()])
        )->assertStatus(200);

        $this->assertDatabaseCount('schedule_days', 7);
        $this->assertDatabaseHas('schedule_days', [
            'employee_schedule_id' => $schedule->id,
            'day_of_week' => 6,
            'is_day_off' => false,
            'expected_start' => '10:00:00',
        ]);
    }

    #[Test]
    public function moving_effective_from_forward_realigns_the_previous_closed_schedule(): void
    {
        // Previous schedule was closed when the active one was created on 2026-03-01.
        $previous = EmployeeSchedule::factory()->create([
            'employment_period_id' => $this->period->id,
            'effective_from' => '2026-01-01',
            'effective_to' => '2026-02-28',
        ]);
        $schedule = $this->makeActiveSchedule(['effective_from' => '2026-03-01']);

        $this->putJson(
            "/api/v1/schedules/{$schedule->public_id}",
            $this->validPayload(['effective_from' => '2026-04-01'])
        )->assertStatus(200);

        // Without realignment this would leave a coverage gap from 2026-03-01 to 2026-03-31.
        $this->assertDatabaseHas('employee_schedules', [
            'id' => $previous->id,
            'effective_to' => '2026-03-31',
        ]);
        $this->assertDatabaseHas('employee_schedules', [
            'id' => $schedule->id,
            'effective_from' => '2026-04-01',
        ]);
    }

    #[Test]
    public function moving_effective_from_backward_shrinks_the_previous_closed_schedule(): void
    {
        $previous = EmployeeSchedule::factory()->create([
            'employment_period_id' => $this->period->id,
            'effective_from' => '2026-01-01',
            'effective_to' => '2026-02-28',
        ]);
        $schedule = $this->makeActiveSchedule(['effective_from' => '2026-03-01']);

        $this->putJson(
            "/api/v1/schedules/{$schedule->public_id}",
            $this->validPayload(['effective_from' => '2026-02-10'])
        )->assertStatus(200);

        $this->assertDatabaseHas('employee_schedules', [
            'id' => $previous->id,
            'effective_to' => '2026-02-09',
        ]);
    }

    #[Test]
    public function updating_without_changing_effective_from_leaves_previous_schedule_untouched(): void
    {
        $previous = EmployeeSchedule::factory()->create([
            'employment_period_id' => $this->period->id,
            'effective_from' => '2026-01-01',
            'effective_to' => '2026-02-28',
        ]);
        $schedule = $this->makeActiveSchedule(['effective_from' => '2026-03-01']);

        $this->putJson(
            "/api/v1/schedules/{$schedule->public_id}",
            $this->validPayload(['effective_from' => '2026-03-01'])
        )->assertStatus(200);

        $this->assertDatabaseHas('employee_schedules', [
            'id' => $previous->id,
            'effective_to' => '2026-02-28',
        ]);
    }

    #[Test]
    public function validation_rejects_effective_from_at_the_previous_schedule_effective_from(): void
    {
        EmployeeSchedule::factory()->create([
            'employment_period_id' => $this->period->id,
            'effective_from' => '2026-01-01',
            'effective_to' => '2026-02-28',
        ]);
        $schedule = $this->makeActiveSchedule(['effective_from' => '2026-03-01']);

        $response = $this->putJson(
            "/api/v1/schedules/{$schedule->public_id}",
            $this->validPayload(['effective_from' => '2026-01-01'])
        );

        $response->assertStatus(422);
        $this->assertArrayHasKey('effective_from', $response->json('errors'));
    }

    #[Test]
    public function validation_rejects_effective_from_before_the_previous_schedule_effective_from(): void
    {
        EmployeeSchedule::factory()->create([
            'employment_period_id' => $this->period->id,
            'effective_from' => '2026-01-15',
            'effective_to' => '2026-02-28',
        ]);
        $schedule = $this->makeActiveSchedule(['effective_from' => '2026-03-01']);

        $response = $this->putJson(
            "/api/v1/schedules/{$schedule->public_id}",
            $this->validPayload(['effective_from' => '2026-01-01'])
        );

        $response->assertStatus(422);
        $this->assertArrayHasKey('effective_from', $response->json('errors'));
    }

    #[Test]
    public function validation_rejects_update_on_a_closed_schedule(): void
    {
        $schedule = $this->makeActiveSchedule(['effective_to' => '2026-02-28']);

        $response = $this->putJson(
            "/api/v1/schedules/{$schedule->public_id}",
            $this->validPayload()
        );

        $response->assertStatus(422);
        $this->assertArrayHasKey('schedule', $response->json('errors'));
    }

    #[Test]
    public function validation_rejects_when_a_working_day_is_missing_expected_start(): void
    {
        $schedule = $this->makeActiveSchedule();

        $days = collect(range(1, 7))->map(fn ($dow) => [
            'day_of_week' => $dow,
            'is_day_off' => false,
            'expected_start' => null,
            'expected_end' => '17:00',
        ])->toArray();

        $response = $this->putJson(
            "/api/v1/schedules/{$schedule->public_id}",
            $this->validPayload(['days' => $days])
        );

        $response->assertStatus(422);
        $this->assertArrayHasKey('days.0.expected_start', $response->json('errors'));
    }

    #[Test]
    public function validation_rejects_duplicate_day_of_week(): void
    {
        $schedule = $this->makeActiveSchedule();

        $payload = $this->validPayload();
        $payload['days'][1]['day_of_week'] = 1;

        $response = $this->putJson(
            "/api/v1/schedules/{$schedule->public_id}",
            $payload
        );

        $response->assertStatus(422);
        $this->assertArrayHasKey('days.1.day_of_week', $response->json('errors'));
    }

    #[Test]
    public function validation_rejects_when_days_array_has_less_than_7_entries(): void
    {
        $schedule = $this->makeActiveSchedule();

        $payload = $this->validPayload();
        $payload['days'] = array_slice($payload['days'], 0, 5);

        $response = $this->putJson(
            "/api/v1/schedules/{$schedule->public_id}",
            $payload
        );

        $response->assertStatus(422);
        $this->assertArrayHasKey('days', $response->json('errors'));
    }

    #[Test]
    public function returns_404_for_nonexistent_schedule(): void
    {
        $response = $this->putJson(
            '/api/v1/schedules/nonexistent-ulid',
            $this->validPayload()
        );

        $response->assertStatus(404);
    }

    #[Test]
    public function unauthenticated_request_returns_401(): void
    {
        app('auth')->forgetGuards();

        $schedule = $this->makeActiveSchedule();

        $response = $this->putJson(
            "/api/v1/schedules/{$schedule->public_id}",
            $this->validPayload()
        );

        $response->assertStatus(401);
    }

    #[Test]
    public function user_without_permission_returns_403(): void
    {
        $schedule = $this->makeActiveSchedule();

        $user = User::factory()->create();
        Passport::actingAs($user);

        $response = $this->putJson(
            "/api/v1/schedules/{$schedule->public_id}",
            $this->validPayload()
        );

        $response->assertStatus(403);
    }
}
