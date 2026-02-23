<?php

namespace Tests\Feature\AttendancePayroll;

use App\Models\Employee;
use App\Models\User;
use App\Models\WageHistory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class WageHistoryApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();

        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        Permission::create(['name' => 'employees.view', 'guard_name' => 'api']);
        Permission::create(['name' => 'employees.update', 'guard_name' => 'api']);

        $role = Role::create(['name' => 'admin', 'guard_name' => 'api']);
        $role->givePermissionTo(['employees.view', 'employees.update']);

        // Ensure position roles exist for Employee factory
        foreach (\App\Models\Employee::POSITION_ROLES as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);
        }
        $this->user = User::factory()->create();
        $this->user->assignRole('admin');

        Passport::actingAs($this->user);
    }

    public function test_create_wage_auto_closes_previous(): void
    {
        $employee = Employee::factory()->create();

        $old = WageHistory::factory()->effectiveBetween('2026-01-01')->create([
            'employee_id' => $employee->id,
            'effective_to' => null,
        ]);

        $payload = [
            'hourly_rate' => 100.00,
            'weekly_scheduled_hours' => 48.00,
            'effective_from' => '2026-02-01',
        ];

        $response = $this->postJson("/api/v1/employees/{$employee->public_id}/wages", $payload);

        $response->assertStatus(201)
            ->assertJsonPath('data.hourly_rate', '100.00');

        $this->assertDatabaseHas('wage_histories', [
            'id' => $old->id,
            'effective_to' => '2026-01-31',
        ]);

        $this->assertDatabaseHas('wage_histories', [
            'employee_id' => $employee->id,
            'hourly_rate' => '100.00',
            'effective_from' => '2026-02-01',
        ]);
    }

    public function test_list_wages_returns_ordered_history(): void
    {
        $employee = Employee::factory()->create();

        WageHistory::factory()->effectiveBetween('2025-01-01', '2025-12-31')->create(['employee_id' => $employee->id]);
        WageHistory::factory()->effectiveBetween('2026-01-01')->create(['employee_id' => $employee->id]);

        $response = $this->getJson("/api/v1/employees/{$employee->public_id}/wages");

        $response->assertStatus(200);

        $wages = $response->json('data');
        $this->assertCount(2, $wages);
        $this->assertStringStartsWith('2026-01-01', $wages[0]['effective_from']);
    }

    public function test_create_wage_rejects_invalid_rate(): void
    {
        $employee = Employee::factory()->create();

        $payload = [
            'hourly_rate' => 0,
            'weekly_scheduled_hours' => 40,
            'effective_from' => '2026-03-01',
        ];

        $response = $this->postJson("/api/v1/employees/{$employee->public_id}/wages", $payload);

        $response->assertStatus(422);
        $this->assertArrayHasKey('hourly_rate', $response->json('errors'));
    }
}
