<?php

namespace Tests\Feature\NegotiatedExtraDay;

use App\Models\Employee;
use App\Models\EmploymentPeriod;
use App\Models\NegotiatedExtraDay;
use App\Models\User;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class ListNegotiatedExtraDaysTest extends NegotiatedExtraDayTestCase
{
    protected User $user;

    protected Employee $employee;

    protected function setUp(): void
    {
        parent::setUp();

        Permission::firstOrCreate(['name' => 'employees.view', 'guard_name' => 'api']);
        $role = Role::firstOrCreate(['name' => 'manager', 'guard_name' => 'api']);
        $role->givePermissionTo('employees.view');

        $this->user = User::factory()->create();
        $this->user->assignRole('manager');

        Passport::actingAs($this->user);

        $period = EmploymentPeriod::factory()->create(['is_active' => true]);
        $this->employee = $period->employee;
    }

    #[Test]
    public function returns_paginated_list_of_negotiated_extra_days(): void
    {
        NegotiatedExtraDay::factory()->count(3)->create([
            'employee_id' => $this->employee->id,
            'approved_by' => $this->user->id,
        ]);

        $response = $this->getJson("/api/v1/employees/{$this->employee->public_id}/negotiated-extra-days");

        $response->assertStatus(200)
            ->assertJsonCount(3, 'data')
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'employee_id', 'date', 'agreed_daily_wage', 'prima_percent', 'prima_amount', 'approved_by', 'status', 'notes'],
                ],
                'meta' => ['current_page', 'last_page', 'per_page', 'total'],
            ]);
    }

    #[Test]
    public function filters_by_date_from(): void
    {
        NegotiatedExtraDay::factory()->create([
            'employee_id' => $this->employee->id,
            'approved_by' => $this->user->id,
            'date' => '2026-03-01',
        ]);
        NegotiatedExtraDay::factory()->create([
            'employee_id' => $this->employee->id,
            'approved_by' => $this->user->id,
            'date' => '2026-04-15',
        ]);

        $response = $this->getJson(
            "/api/v1/employees/{$this->employee->public_id}/negotiated-extra-days?date_from=2026-04-01"
        );

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.date', '2026-04-15');
    }

    #[Test]
    public function filters_by_date_to(): void
    {
        NegotiatedExtraDay::factory()->create([
            'employee_id' => $this->employee->id,
            'approved_by' => $this->user->id,
            'date' => '2026-03-01',
        ]);
        NegotiatedExtraDay::factory()->create([
            'employee_id' => $this->employee->id,
            'approved_by' => $this->user->id,
            'date' => '2026-04-15',
        ]);

        $response = $this->getJson(
            "/api/v1/employees/{$this->employee->public_id}/negotiated-extra-days?date_to=2026-03-31"
        );

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.date', '2026-03-01');
    }

    #[Test]
    public function filters_by_date_range(): void
    {
        NegotiatedExtraDay::factory()->create([
            'employee_id' => $this->employee->id,
            'approved_by' => $this->user->id,
            'date' => '2026-02-10',
        ]);
        NegotiatedExtraDay::factory()->create([
            'employee_id' => $this->employee->id,
            'approved_by' => $this->user->id,
            'date' => '2026-03-15',
        ]);
        NegotiatedExtraDay::factory()->create([
            'employee_id' => $this->employee->id,
            'approved_by' => $this->user->id,
            'date' => '2026-05-01',
        ]);

        $response = $this->getJson(
            "/api/v1/employees/{$this->employee->public_id}/negotiated-extra-days?date_from=2026-03-01&date_to=2026-04-30"
        );

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.date', '2026-03-15');
    }

    #[Test]
    public function returns_empty_list_when_no_extra_days(): void
    {
        $response = $this->getJson("/api/v1/employees/{$this->employee->public_id}/negotiated-extra-days");

        $response->assertStatus(200)
            ->assertJsonCount(0, 'data')
            ->assertJsonPath('meta.total', 0);
    }

    #[Test]
    public function returns_404_for_nonexistent_employee(): void
    {
        $response = $this->getJson('/api/v1/employees/nonexistent-ulid/negotiated-extra-days');

        $response->assertStatus(404);
    }

    #[Test]
    public function rejects_unauthenticated_request(): void
    {
        auth()->forgetGuards();

        $response = $this->getJson("/api/v1/employees/{$this->employee->public_id}/negotiated-extra-days");

        $response->assertStatus(401);
    }

    #[Test]
    public function rejects_user_without_employees_view_permission(): void
    {
        $noPermUser = User::factory()->create();
        Passport::actingAs($noPermUser);

        $response = $this->getJson("/api/v1/employees/{$this->employee->public_id}/negotiated-extra-days");

        $response->assertStatus(403);
    }
}
