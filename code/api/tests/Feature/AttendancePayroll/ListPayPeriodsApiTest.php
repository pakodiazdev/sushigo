<?php

namespace Tests\Feature\AttendancePayroll;

use App\Models\Branch;
use App\Models\Employee;
use App\Models\PayPeriod;
use App\Models\PayPeriodEmployee;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ListPayPeriodsApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected Branch $branch;

    protected function setUp(): void
    {
        parent::setUp();

        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        Permission::create(['name' => 'payroll.preview', 'guard_name' => 'api']);

        foreach (Employee::POSITION_ROLES as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);
        }

        $adminRole = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'api']);
        $adminRole->givePermissionTo('payroll.preview');

        $this->user = User::factory()->create();
        $this->user->assignRole('admin');
        $this->branch = Branch::factory()->create();

        Passport::actingAs($this->user);
    }

    private function closePeriod(Branch $branch, string $start, string $end, string $status = PayPeriod::STATUS_CLOSED): PayPeriod
    {
        $payPeriod = PayPeriod::create([
            'branch_id' => $branch->id,
            'period_start' => $start,
            'period_end' => $end,
            'status' => $status,
            'closed_by' => $this->user->id,
            'closed_at' => now(),
        ]);

        $employee = Employee::factory()->create(['is_active' => true]);

        PayPeriodEmployee::create([
            'pay_period_id' => $payPeriod->id,
            'employee_id' => $employee->id,
            'base_pay' => 100,
            'late_deductions' => 0,
            'unpaid_leave_deductions' => 0,
            'overtime_pay' => 0,
            'extra_day_pay' => 0,
            'punctuality_bonus' => 0,
            'holiday_pay' => 0,
            'other_adjustments' => 0,
            'total_pay' => 100,
            'free_hours_earned' => 0,
        ]);

        return $payPeriod;
    }

    public function test_list_returns_paginated_periods_for_branch(): void
    {
        $this->closePeriod($this->branch, '2026-06-22', '2026-06-28');
        $this->closePeriod($this->branch, '2026-06-29', '2026-07-05');

        $response = $this->getJson('/api/v1/pay-periods?branch_id='.$this->branch->id);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'data' => [
                    '*' => [
                        'id',
                        'branch_id',
                        'period_start',
                        'period_end',
                        'status',
                        'closed_by',
                        'closed_at',
                        'total_employees',
                    ],
                ],
                'meta' => ['current_page', 'last_page', 'per_page', 'total'],
            ]);

        $this->assertCount(2, $response->json('data'));
        $this->assertEquals(1, $response->json('data.0.total_employees'));
    }

    public function test_list_excludes_periods_from_other_branches(): void
    {
        $otherBranch = Branch::factory()->create();
        $this->closePeriod($otherBranch, '2026-06-22', '2026-06-28');

        $response = $this->getJson('/api/v1/pay-periods?branch_id='.$this->branch->id);

        $response->assertStatus(200);
        $this->assertCount(0, $response->json('data'));
    }

    public function test_list_filters_by_status(): void
    {
        $this->closePeriod($this->branch, '2026-06-22', '2026-06-28', PayPeriod::STATUS_CLOSED);
        $this->closePeriod($this->branch, '2026-06-29', '2026-07-05', PayPeriod::STATUS_REOPENED);

        $response = $this->getJson('/api/v1/pay-periods?branch_id='.$this->branch->id.'&status=REOPENED');

        $response->assertStatus(200);
        $this->assertCount(1, $response->json('data'));
        $this->assertEquals('REOPENED', $response->json('data.0.status'));
    }

    public function test_list_filters_by_period_range(): void
    {
        $this->closePeriod($this->branch, '2026-06-01', '2026-06-07');
        $this->closePeriod($this->branch, '2026-06-22', '2026-06-28');

        $response = $this->getJson('/api/v1/pay-periods?branch_id='.$this->branch->id.'&period_start=2026-06-15&period_end=2026-06-30');

        $response->assertStatus(200);
        $this->assertCount(1, $response->json('data'));
        $this->assertEquals('2026-06-22', $response->json('data.0.period_start'));
    }

    public function test_list_returns_403_without_permission(): void
    {
        $unprivilegedUser = User::factory()->create();
        Passport::actingAs($unprivilegedUser);

        $this->getJson('/api/v1/pay-periods?branch_id='.$this->branch->id)
            ->assertStatus(403);
    }

    public function test_list_returns_422_for_invalid_status(): void
    {
        $this->getJson('/api/v1/pay-periods?branch_id='.$this->branch->id.'&status=BOGUS')
            ->assertStatus(422)
            ->assertJsonValidationErrors(['status']);
    }

    public function test_list_returns_422_when_period_end_before_period_start(): void
    {
        $this->getJson('/api/v1/pay-periods?branch_id='.$this->branch->id.'&period_start=2026-06-28&period_end=2026-06-22')
            ->assertStatus(422)
            ->assertJsonValidationErrors(['period_end']);
    }

    public function test_list_returns_422_when_branch_id_missing(): void
    {
        $this->getJson('/api/v1/pay-periods')
            ->assertStatus(422)
            ->assertJsonValidationErrors(['branch_id']);
    }
}
