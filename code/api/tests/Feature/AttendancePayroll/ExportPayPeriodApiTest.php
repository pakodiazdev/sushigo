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
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class ExportPayPeriodApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected Branch $branch;

    protected function setUp(): void
    {
        parent::setUp();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

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

    private function createClosedPeriodWithEmployee(): PayPeriod
    {
        $payPeriod = PayPeriod::create([
            'branch_id' => $this->branch->id,
            'period_start' => '2026-06-22',
            'period_end' => '2026-06-28',
            'status' => PayPeriod::STATUS_CLOSED,
            'closed_by' => $this->user->id,
            'closed_at' => now(),
        ]);

        $employee = Employee::factory()->withName('Ana', 'García')->create([
            'is_active' => true,
            'code' => 'EMP-001',
        ]);

        PayPeriodEmployee::create([
            'pay_period_id' => $payPeriod->id,
            'employee_id' => $employee->id,
            'base_pay' => 350,
            'late_deductions' => 10,
            'unpaid_leave_deductions' => 0,
            'overtime_pay' => 60,
            'extra_day_pay' => 0,
            'punctuality_bonus' => 20,
            'holiday_pay' => 0,
            'other_adjustments' => 0,
            'total_pay' => 420,
            'free_hours_earned' => 0,
        ]);

        return $payPeriod;
    }

    public function test_export_returns_csv_with_bom_headers_and_one_row_per_employee(): void
    {
        $payPeriod = $this->createClosedPeriodWithEmployee();

        $response = $this->get('/api/v1/pay-periods/'.$payPeriod->public_id.'/export?format=csv');

        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
        $this->assertStringContainsString('attachment', $response->headers->get('Content-Disposition'));
        $this->assertStringContainsString(
            'periodo-nomina-2026-06-22-2026-06-28.csv',
            $response->headers->get('Content-Disposition')
        );

        $content = $response->streamedContent();

        $this->assertStringStartsWith("\xEF\xBB\xBF", $content);

        $body = substr($content, 3);
        $lines = array_values(array_filter(explode("\r\n", $body)));

        $this->assertCount(2, $lines);

        $header = str_getcsv($lines[0]);
        $this->assertEquals([
            'code', 'name', 'base_pay', 'late_deductions', 'unpaid_leave_deductions',
            'overtime_pay', 'extra_day_pay', 'punctuality_bonus', 'holiday_pay', 'total_pay',
        ], $header);

        $row = str_getcsv($lines[1]);
        $this->assertEquals('EMP-001', $row[0]);
        $this->assertEquals('Ana García', $row[1]);
        $this->assertEquals('350.00', $row[2]);
        $this->assertEquals('10.00', $row[3]);
        $this->assertEquals('420.00', $row[9]);
    }

    public function test_export_returns_403_without_permission(): void
    {
        $payPeriod = $this->createClosedPeriodWithEmployee();

        $unprivilegedUser = User::factory()->create();
        Passport::actingAs($unprivilegedUser);

        $this->get('/api/v1/pay-periods/'.$payPeriod->public_id.'/export?format=csv')
            ->assertStatus(403);
    }

    public function test_export_returns_404_for_unknown_period(): void
    {
        $this->get('/api/v1/pay-periods/01JUNKNOWNULIDDOESNOTEXIST/export?format=csv')
            ->assertStatus(404);
    }

    public function test_export_returns_422_for_an_open_period(): void
    {
        $payPeriod = PayPeriod::create([
            'branch_id' => $this->branch->id,
            'period_start' => '2026-06-22',
            'period_end' => '2026-06-28',
            'status' => PayPeriod::STATUS_OPEN,
        ]);

        $this->getJson('/api/v1/pay-periods/'.$payPeriod->public_id.'/export?format=csv')
            ->assertStatus(422)
            ->assertJsonValidationErrors('status');
    }

    public function test_export_returns_422_for_a_reopened_period(): void
    {
        $payPeriod = PayPeriod::create([
            'branch_id' => $this->branch->id,
            'period_start' => '2026-06-22',
            'period_end' => '2026-06-28',
            'status' => PayPeriod::STATUS_REOPENED,
        ]);

        $this->getJson('/api/v1/pay-periods/'.$payPeriod->public_id.'/export?format=csv')
            ->assertStatus(422)
            ->assertJsonValidationErrors('status');
    }
}
