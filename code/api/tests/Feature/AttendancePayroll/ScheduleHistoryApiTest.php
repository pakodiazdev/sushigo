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

class ScheduleHistoryApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected User $noPermissionsUser;

    protected EmploymentPeriod $period;

    protected function setUp(): void
    {
        parent::setUp();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        Permission::create(['name' => 'employees.view', 'guard_name' => 'api']);
        Permission::create(['name' => 'employees.update', 'guard_name' => 'api']);

        $role = Role::create(['name' => 'admin', 'guard_name' => 'api']);
        $role->givePermissionTo('employees.view');
        $role->givePermissionTo('employees.update');

        foreach (Employee::POSITION_ROLES as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);
        }

        $this->admin = User::factory()->create();
        $this->admin->assignRole('admin');

        $this->noPermissionsUser = User::factory()->create();

        $this->period = EmploymentPeriod::factory()->create(['is_active' => true]);
    }

    private function url(): string
    {
        return "/api/v1/employment-periods/{$this->period->public_id}/schedules";
    }

    // ── Authorization ─────────────────────────────────────────────────────────

    #[Test]
    public function unauthenticated_request_returns_401(): void
    {
        $response = $this->getJson($this->url());

        $response->assertStatus(401);
    }

    #[Test]
    public function user_without_employees_view_permission_returns_403(): void
    {
        Passport::actingAs($this->noPermissionsUser);

        $response = $this->getJson($this->url());

        $response->assertStatus(403);
    }

    #[Test]
    public function admin_can_list_schedules(): void
    {
        Passport::actingAs($this->admin);

        EmployeeSchedule::factory()->create([
            'employment_period_id' => $this->period->id,
            'effective_from' => Carbon::parse('2026-01-01'),
            'effective_to' => Carbon::parse('2026-02-28'),
        ]);

        $response = $this->getJson($this->url());

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'effective_from',
                        'effective_to',
                        'workday_type',
                        'working_days_per_week',
                        'days',
                        'overrides',
                        'created_at',
                        'updated_at',
                    ],
                ],
            ]);
    }

    // ── List Schedules ────────────────────────────────────────────────────────

    #[Test]
    public function returns_schedules_ordered_by_effective_from_desc(): void
    {
        Passport::actingAs($this->admin);

        $older = EmployeeSchedule::factory()->create([
            'employment_period_id' => $this->period->id,
            'effective_from' => Carbon::parse('2026-01-01'),
            'effective_to' => Carbon::parse('2026-02-28'),
        ]);

        $newer = EmployeeSchedule::factory()->create([
            'employment_period_id' => $this->period->id,
            'effective_from' => Carbon::parse('2026-03-01'),
            'effective_to' => null,
        ]);

        $response = $this->getJson($this->url());

        $response->assertStatus(200);

        $data = $response->json('data');
        $this->assertCount(2, $data);
        $this->assertEquals($newer->public_id, $data[0]['id']);
        $this->assertEquals($older->public_id, $data[1]['id']);
    }

    #[Test]
    public function returns_schedule_days_in_response(): void
    {
        Passport::actingAs($this->admin);

        $schedule = EmployeeSchedule::factory()->create([
            'employment_period_id' => $this->period->id,
            'effective_from' => Carbon::parse('2026-01-01'),
            'effective_to' => null,
        ]);

        $schedule->scheduleDays()->create([
            'day_of_week' => 1,
            'is_day_off' => false,
            'expected_start' => '09:00:00',
            'expected_end' => '18:00:00',
            'expected_lunch_start' => '14:00:00',
            'expected_lunch_end' => '15:00:00',
            'lunch_duration_minutes' => 60,
        ]);

        $response = $this->getJson($this->url());

        $response->assertStatus(200)
            ->assertJsonPath('data.0.days.0.day_of_week', 1)
            ->assertJsonPath('data.0.days.0.expected_start', '09:00');
    }

    #[Test]
    public function returns_overrides_filtered_by_schedule_date_range(): void
    {
        Passport::actingAs($this->admin);

        Carbon::setTestNow(Carbon::parse('2026-04-15'));

        // First schedule: Jan 1 - Feb 28, 2026
        EmployeeSchedule::factory()->create([
            'employment_period_id' => $this->period->id,
            'effective_from' => Carbon::parse('2026-01-01'),
            'effective_to' => Carbon::parse('2026-02-28'),
        ]);

        // Second schedule: Mar 1 - onwards
        EmployeeSchedule::factory()->create([
            'employment_period_id' => $this->period->id,
            'effective_from' => Carbon::parse('2026-03-01'),
            'effective_to' => null,
        ]);

        // Override in January (belongs to first schedule)
        $januaryOverride = ScheduleDayOverride::factory()->create([
            'employment_period_id' => $this->period->id,
            'day_of_week' => 1,
            'effective_from' => Carbon::parse('2026-01-15'),
            'effective_to' => Carbon::parse('2026-01-15'),
            'note' => 'January override',
        ]);

        // Override in March (belongs to second schedule)
        $marchOverride = ScheduleDayOverride::factory()->create([
            'employment_period_id' => $this->period->id,
            'day_of_week' => 1,
            'effective_from' => Carbon::parse('2026-03-15'),
            'effective_to' => Carbon::parse('2026-03-15'),
            'note' => 'March override',
        ]);

        $response = $this->getJson($this->url());

        $response->assertStatus(200);

        $data = $response->json('data');

        // Second schedule (Mar 1 onwards) should only have March override
        $secondSchedule = collect($data)->firstWhere('effective_from', '2026-03-01');
        $this->assertCount(1, $secondSchedule['overrides']);
        $this->assertEquals('March override', $secondSchedule['overrides'][0]['note']);

        // First schedule (Jan - Feb) should only have January override
        $firstSchedule = collect($data)->firstWhere('effective_from', '2026-01-01');
        $this->assertCount(1, $firstSchedule['overrides']);
        $this->assertEquals('January override', $firstSchedule['overrides'][0]['note']);

        Carbon::setTestNow();
    }

    #[Test]
    public function returns_empty_array_when_no_schedules(): void
    {
        Passport::actingAs($this->admin);

        $response = $this->getJson($this->url());

        $response->assertStatus(200)
            ->assertJsonPath('data', []);
    }

    #[Test]
    public function returns_404_for_invalid_employment_period(): void
    {
        Passport::actingAs($this->admin);

        $response = $this->getJson('/api/v1/employment-periods/01INVALIDPUBLICID/schedules');

        $response->assertStatus(404);
    }

    #[Test]
    public function excludes_overrides_starting_before_schedule_effective_from(): void
    {
        Passport::actingAs($this->admin);

        EmployeeSchedule::factory()->create([
            'employment_period_id' => $this->period->id,
            'effective_from' => Carbon::parse('2026-03-01'),
            'effective_to' => null,
        ]);

        // Override before schedule start (should be excluded)
        ScheduleDayOverride::factory()->create([
            'employment_period_id' => $this->period->id,
            'day_of_week' => 1,
            'effective_from' => Carbon::parse('2026-02-15'),
            'effective_to' => Carbon::parse('2026-02-15'),
            'note' => 'Before schedule',
        ]);

        $response = $this->getJson($this->url());

        $response->assertStatus(200);
        $this->assertCount(0, $response->json('data.0.overrides'));
    }

    #[Test]
    public function includes_future_dated_overrides_for_active_schedule(): void
    {
        Passport::actingAs($this->admin);

        Carbon::setTestNow(Carbon::parse('2026-04-01'));

        EmployeeSchedule::factory()->create([
            'employment_period_id' => $this->period->id,
            'effective_from' => Carbon::parse('2026-03-01'),
            'effective_to' => null,
        ]);

        // Future override (should be included for active schedule)
        ScheduleDayOverride::factory()->create([
            'employment_period_id' => $this->period->id,
            'day_of_week' => 1,
            'effective_from' => Carbon::parse('2026-06-15'),
            'effective_to' => Carbon::parse('2026-06-15'),
            'note' => 'Future override',
        ]);

        $response = $this->getJson($this->url());

        $response->assertStatus(200);
        $this->assertCount(1, $response->json('data.0.overrides'));
        $this->assertEquals('Future override', $response->json('data.0.overrides.0.note'));

        Carbon::setTestNow();
    }

    #[Test]
    public function excludes_overrides_after_schedule_end_date(): void
    {
        Passport::actingAs($this->admin);

        EmployeeSchedule::factory()->create([
            'employment_period_id' => $this->period->id,
            'effective_from' => Carbon::parse('2026-01-01'),
            'effective_to' => Carbon::parse('2026-02-28'),
        ]);

        // Override after schedule end (should be excluded)
        ScheduleDayOverride::factory()->create([
            'employment_period_id' => $this->period->id,
            'day_of_week' => 1,
            'effective_from' => Carbon::parse('2026-03-15'),
            'effective_to' => Carbon::parse('2026-03-15'),
            'note' => 'After schedule end',
        ]);

        $response = $this->getJson($this->url());

        $response->assertStatus(200);
        $this->assertCount(0, $response->json('data.0.overrides'));
    }
}
