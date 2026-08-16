<?php

namespace Tests\Feature\AttendancePayroll;

use App\Models\Branch;
use App\Models\Employee;
use App\Models\MediaAsset;
use App\Models\MediaGallery;
use App\Models\PayPeriod;
use App\Models\PayPeriodEmployee;
use App\Models\PayPeriodLine;
use App\Models\User;
use App\Services\Media\MediaAttachmentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ShowPayPeriodApiTest extends TestCase
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

    public function test_show_returns_period_detail_with_employees_and_lines(): void
    {
        $payPeriod = PayPeriod::create([
            'branch_id' => $this->branch->id,
            'period_start' => '2026-06-22',
            'period_end' => '2026-06-28',
            'status' => PayPeriod::STATUS_CLOSED,
            'closed_by' => $this->user->id,
            'closed_at' => now(),
        ]);

        $employee = Employee::factory()->create(['is_active' => true]);

        $payPeriodEmployee = PayPeriodEmployee::create([
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

        PayPeriodLine::create([
            'pay_period_employee_id' => $payPeriodEmployee->id,
            'date' => '2026-06-22',
            'concept' => PayPeriodLine::CONCEPT_BASE_PAY,
            'description' => 'Worked day',
            'amount' => 350,
            'minutes' => 480,
        ]);

        $response = $this->getJson('/api/v1/pay-periods/'.$payPeriod->public_id);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'data' => [
                    'id',
                    'branch_id',
                    'period_start',
                    'period_end',
                    'status',
                    'closed_by',
                    'closed_at',
                    'total_employees',
                    'employees' => [
                        '*' => [
                            'employee',
                            'base_pay',
                            'late_deductions',
                            'unpaid_leave_deductions',
                            'overtime_pay',
                            'extra_day_pay',
                            'punctuality_bonus',
                            'holiday_pay',
                            'other_adjustments',
                            'total_pay',
                            'free_hours_earned',
                            'pay_period_lines',
                        ],
                    ],
                ],
            ]);

        $this->assertEquals($payPeriod->public_id, $response->json('data.id'));
        $this->assertEquals('CLOSED', $response->json('data.status'));
        $this->assertCount(1, $response->json('data.employees'));
        $this->assertEquals(420.0, (float) $response->json('data.employees.0.total_pay'));
        $this->assertCount(1, $response->json('data.employees.0.pay_period_lines'));
        $this->assertEquals('BASE_PAY', $response->json('data.employees.0.pay_period_lines.0.concept'));
    }

    public function test_show_exposes_the_employees_avatar_url(): void
    {
        $payPeriod = PayPeriod::create([
            'branch_id' => $this->branch->id,
            'period_start' => '2026-06-22',
            'period_end' => '2026-06-28',
            'status' => PayPeriod::STATUS_CLOSED,
            'closed_by' => $this->user->id,
            'closed_at' => now(),
        ]);

        $employee = Employee::factory()->create(['is_active' => true]);

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

        $gallery = MediaGallery::create(['name' => 'Avatar gallery']);
        MediaAsset::create([
            'media_gallery_id' => $gallery->id,
            'path' => 'media/'.uniqid().'.jpg',
            'mime_type' => 'image/jpeg',
            'filename' => 'avatar.jpg',
            'size' => 1024,
            'position' => 0,
            'is_primary' => true,
        ]);
        app(MediaAttachmentService::class)($employee->user, $gallery->id);

        $response = $this->getJson('/api/v1/pay-periods/'.$payPeriod->public_id);

        $response->assertStatus(200);
        $this->assertNotNull($response->json('data.employees.0.employee.avatar_url'));
    }

    public function test_show_returns_null_date_for_lines_without_a_date(): void
    {
        $payPeriod = PayPeriod::create([
            'branch_id' => $this->branch->id,
            'period_start' => '2026-06-22',
            'period_end' => '2026-06-28',
            'status' => PayPeriod::STATUS_CLOSED,
            'closed_by' => $this->user->id,
            'closed_at' => now(),
        ]);

        $employee = Employee::factory()->create(['is_active' => true]);

        $payPeriodEmployee = PayPeriodEmployee::create([
            'pay_period_id' => $payPeriod->id,
            'employee_id' => $employee->id,
            'base_pay' => 350,
            'late_deductions' => 0,
            'unpaid_leave_deductions' => 0,
            'overtime_pay' => 0,
            'extra_day_pay' => 0,
            'punctuality_bonus' => 0,
            'holiday_pay' => 0,
            'other_adjustments' => 0,
            'total_pay' => 350,
            'free_hours_earned' => 0,
        ]);

        PayPeriodLine::create([
            'pay_period_employee_id' => $payPeriodEmployee->id,
            'date' => null,
            'concept' => PayPeriodLine::CONCEPT_OTHER,
            'description' => 'Ajuste manual',
            'amount' => 50,
            'minutes' => null,
        ]);

        $response = $this->getJson('/api/v1/pay-periods/'.$payPeriod->public_id);

        $response->assertStatus(200);
        $this->assertNull($response->json('data.employees.0.pay_period_lines.0.date'));
    }

    public function test_show_returns_403_without_permission(): void
    {
        $payPeriod = PayPeriod::create([
            'branch_id' => $this->branch->id,
            'period_start' => '2026-06-22',
            'period_end' => '2026-06-28',
            'status' => PayPeriod::STATUS_CLOSED,
            'closed_by' => $this->user->id,
            'closed_at' => now(),
        ]);

        $unprivilegedUser = User::factory()->create();
        Passport::actingAs($unprivilegedUser);

        $this->getJson('/api/v1/pay-periods/'.$payPeriod->public_id)
            ->assertStatus(403);
    }

    public function test_show_returns_404_for_unknown_period(): void
    {
        $this->getJson('/api/v1/pay-periods/01JUNKNOWNULIDDOESNOTEXIST')
            ->assertStatus(404);
    }
}
