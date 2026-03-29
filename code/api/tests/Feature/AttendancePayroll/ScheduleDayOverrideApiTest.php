<?php

namespace Tests\Feature\AttendancePayroll;

use App\Models\Employee;
use App\Models\EmployeeSchedule;
use App\Models\EmploymentPeriod;
use App\Models\ScheduleDayOverride;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class ScheduleDayOverrideApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected EmploymentPeriod $period;

    protected function setUp(): void
    {
        parent::setUp();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        Permission::create(['name' => 'employees.update', 'guard_name' => 'api']);
        Permission::create(['name' => 'employees.view', 'guard_name' => 'api']);

        $role = Role::create(['name' => 'admin', 'guard_name' => 'api']);
        $role->givePermissionTo('employees.update');
        $role->givePermissionTo('employees.view');

        foreach (Employee::POSITION_ROLES as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);
        }

        $this->admin = User::factory()->create();
        $this->admin->assignRole('admin');
        Passport::actingAs($this->admin);

        $this->period = EmploymentPeriod::factory()->create(['is_active' => true]);
    }

    private function validPayload(array $overrides = []): array
    {
        return array_merge([
            'day_of_week' => 1, // Monday
            'effective_from' => '2026-03-09',
            'effective_to' => '2026-03-09',
            'is_day_off' => false,
            'expected_start' => '09:00',
            'expected_lunch_start' => '14:00',
            'expected_lunch_end' => '15:00',
            'lunch_duration_minutes' => 60,
            'expected_end' => '18:00',
            'note' => 'Paco llega tarde este lunes',
        ], $overrides);
    }

    private function url(): string
    {
        return "/api/v1/employment-periods/{$this->period->public_id}/schedule-day-overrides";
    }

    // ── Create override ───────────────────────────────────────────────────────

    #[Test]
    public function admin_can_create_a_single_date_override(): void
    {
        $response = $this->postJson($this->url(), $this->validPayload());

        $response->assertStatus(201)
            ->assertJsonPath('data.day_of_week', 1)
            ->assertJsonPath('data.effective_from', '2026-03-09')
            ->assertJsonPath('data.effective_to', '2026-03-09')
            ->assertJsonPath('data.is_day_off', false)
            ->assertJsonPath('data.expected_start', '09:00')
            ->assertJsonPath('data.expected_end', '18:00')
            ->assertJsonPath('data.note', 'Paco llega tarde este lunes');

        $this->assertDatabaseHas('schedule_day_overrides', [
            'employment_period_id' => $this->period->id,
            'day_of_week' => 1,
            'effective_from' => '2026-03-09',
            'effective_to' => '2026-03-09',
        ]);
    }

    #[Test]
    public function admin_can_create_an_indefinite_override(): void
    {
        $response = $this->postJson($this->url(), $this->validPayload([
            'effective_from' => '2026-03-09',
            'effective_to' => null,
        ]));

        $response->assertStatus(201)
            ->assertJsonPath('data.effective_to', null);

        $this->assertDatabaseHas('schedule_day_overrides', [
            'employment_period_id' => $this->period->id,
            'effective_to' => null,
        ]);
    }

    #[Test]
    public function admin_can_create_a_day_off_override(): void
    {
        $response = $this->postJson($this->url(), $this->validPayload([
            'is_day_off' => true,
            'expected_start' => '09:00', // should be nullified
            'expected_end' => '18:00', // should be nullified
        ]));

        $response->assertStatus(201)
            ->assertJsonPath('data.is_day_off', true)
            ->assertJsonPath('data.expected_start', null)
            ->assertJsonPath('data.expected_end', null);

        $this->assertDatabaseHas('schedule_day_overrides', [
            'employment_period_id' => $this->period->id,
            'is_day_off' => true,
            'expected_start' => null,
            'expected_end' => null,
        ]);
    }

    #[Test]
    public function response_contains_public_id(): void
    {
        $response = $this->postJson($this->url(), $this->validPayload());

        $response->assertStatus(201);
        $this->assertNotEmpty($response->json('data.id'));
    }

    // ── Validation ────────────────────────────────────────────────────────────

    #[Test]
    public function validation_rejects_missing_expected_start_for_working_day(): void
    {
        $response = $this->postJson($this->url(), $this->validPayload([
            'is_day_off' => false,
            'expected_start' => null,
        ]));

        $response->assertStatus(422);
        $this->assertArrayHasKey('expected_start', $response->json('errors'));
    }

    #[Test]
    public function validation_rejects_missing_expected_end_for_working_day(): void
    {
        $response = $this->postJson($this->url(), $this->validPayload([
            'is_day_off' => false,
            'expected_end' => null,
        ]));

        $response->assertStatus(422);
        $this->assertArrayHasKey('expected_end', $response->json('errors'));
    }

    #[Test]
    public function validation_rejects_effective_to_before_effective_from(): void
    {
        $response = $this->postJson($this->url(), $this->validPayload([
            'effective_from' => '2026-03-15',
            'effective_to' => '2026-03-10',
        ]));

        $response->assertStatus(422);
        $this->assertArrayHasKey('effective_to', $response->json('errors'));
    }

    #[Test]
    public function validation_rejects_invalid_day_of_week(): void
    {
        $response = $this->postJson($this->url(), $this->validPayload([
            'day_of_week' => 8,
        ]));

        $response->assertStatus(422);
        $this->assertArrayHasKey('day_of_week', $response->json('errors'));
    }

    #[Test]
    public function validation_rejects_invalid_time_format(): void
    {
        $response = $this->postJson($this->url(), $this->validPayload([
            'expected_start' => '9:00', // missing leading zero
        ]));

        $response->assertStatus(422);
        $this->assertArrayHasKey('expected_start', $response->json('errors'));
    }

    // ── 404 / 403 ─────────────────────────────────────────────────────────────

    #[Test]
    public function returns_404_for_nonexistent_employment_period(): void
    {
        $response = $this->postJson(
            '/api/v1/employment-periods/nonexistent-ulid/schedule-day-overrides',
            $this->validPayload()
        );

        $response->assertStatus(404);
    }

    #[Test]
    public function returns_403_without_permission(): void
    {
        $user = User::factory()->create();
        Passport::actingAs($user);

        $response = $this->postJson($this->url(), $this->validPayload());

        $response->assertStatus(403);
    }

    // ── Override included in current-schedule ─────────────────────────────────

    #[Test]
    public function current_schedule_response_includes_active_overrides(): void
    {
        $employee = $this->period->employee;

        // Create a current schedule for the period
        $schedule = EmployeeSchedule::factory()->create([
            'employment_period_id' => $this->period->id,
            'effective_from' => Carbon::now()->subMonth()->toDateString(),
            'effective_to' => null,
        ]);

        foreach (range(1, 7) as $dow) {
            $schedule->scheduleDays()->create([
                'day_of_week' => $dow,
                'is_day_off' => $dow >= 6,
                'expected_start' => $dow < 6 ? '08:00:00' : null,
                'expected_end' => $dow < 6 ? '17:00:00' : null,
            ]);
        }

        // Create a not-expired override for Monday
        ScheduleDayOverride::factory()->create([
            'employment_period_id' => $this->period->id,
            'day_of_week' => 1,
            'effective_from' => Carbon::now()->toDateString(),
            'effective_to' => Carbon::now()->addDays(7)->toDateString(),
            'is_day_off' => false,
            'expected_start' => '10:00',
            'expected_end' => '19:00',
        ]);

        // Create an expired override (should NOT appear)
        ScheduleDayOverride::factory()->expired()->create([
            'employment_period_id' => $this->period->id,
            'day_of_week' => 2,
        ]);

        $response = $this->getJson("/api/v1/employees/{$employee->public_id}/current-schedule");

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data.active_overrides')
            ->assertJsonPath('data.active_overrides.0.day_of_week', 1)
            ->assertJsonPath('data.active_overrides.0.expected_start', '10:00');
    }

    #[Test]
    public function current_schedule_returns_empty_active_overrides_when_none_exist(): void
    {
        $employee = $this->period->employee;

        $schedule = EmployeeSchedule::factory()->create([
            'employment_period_id' => $this->period->id,
            'effective_from' => Carbon::now()->subMonth()->toDateString(),
            'effective_to' => null,
        ]);

        foreach (range(1, 7) as $dow) {
            $schedule->scheduleDays()->create([
                'day_of_week' => $dow,
                'is_day_off' => $dow >= 6,
                'expected_start' => $dow < 6 ? '08:00:00' : null,
                'expected_end' => $dow < 6 ? '17:00:00' : null,
            ]);
        }

        $response = $this->getJson("/api/v1/employees/{$employee->public_id}/current-schedule");

        $response->assertStatus(200)
            ->assertJsonCount(0, 'data.active_overrides');
    }
}
