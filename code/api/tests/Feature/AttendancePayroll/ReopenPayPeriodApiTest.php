<?php

namespace Tests\Feature\AttendancePayroll;

use App\Models\Branch;
use App\Models\Employee;
use App\Models\MediaAsset;
use App\Models\MediaGallery;
use App\Models\PayPeriod;
use App\Models\PayPeriodEmployee;
use App\Models\User;
use App\Services\Media\MediaAttachmentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class ReopenPayPeriodApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected Branch $branch;

    protected function setUp(): void
    {
        parent::setUp();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        Permission::create(['name' => 'payroll.reopen', 'guard_name' => 'api']);

        foreach (Employee::POSITION_ROLES as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);
        }

        $adminRole = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'api']);
        $adminRole->givePermissionTo('payroll.reopen');

        $this->admin = User::factory()->create();
        $this->admin->assignRole('admin');
        $this->branch = Branch::factory()->create();

        Passport::actingAs($this->admin);
    }

    private function createClosedPeriod(): PayPeriod
    {
        return PayPeriod::create([
            'branch_id' => $this->branch->id,
            'period_start' => '2026-06-22',
            'period_end' => '2026-06-28',
            'status' => PayPeriod::STATUS_CLOSED,
            'closed_by' => $this->admin->id,
            'closed_at' => now(),
        ]);
    }

    public function test_admin_can_reopen_a_closed_period_with_a_reason(): void
    {
        $payPeriod = $this->createClosedPeriod();

        $response = $this->patchJson("/api/v1/pay-periods/{$payPeriod->public_id}/reopen", [
            'reason' => 'Corrección de horas extra mal capturadas',
        ]);

        $response->assertStatus(200);
        $this->assertEquals('REOPENED', $response->json('data.status'));

        $payPeriod->refresh();
        $this->assertEquals(PayPeriod::STATUS_REOPENED, $payPeriod->status);
        $this->assertEquals($this->admin->id, $payPeriod->reopened_by);
        $this->assertNotNull($payPeriod->reopened_at);
        $this->assertEquals('Corrección de horas extra mal capturadas', $payPeriod->reopen_reason);
    }

    public function test_reopen_exposes_the_employees_avatar_url(): void
    {
        $payPeriod = $this->createClosedPeriod();

        $employee = Employee::factory()->create(['is_active' => true]);
        PayPeriodEmployee::create([
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

        $response = $this->patchJson("/api/v1/pay-periods/{$payPeriod->public_id}/reopen", [
            'reason' => 'Corrección de horas extra mal capturadas',
        ]);

        $response->assertStatus(200);
        $this->assertNotNull($response->json('data.employees.0.employee.avatar_url'));
    }

    public function test_reopen_creates_an_audit_log_entry(): void
    {
        $payPeriod = $this->createClosedPeriod();

        $this->patchJson("/api/v1/pay-periods/{$payPeriod->public_id}/reopen", [
            'reason' => 'Corrección de horas extra mal capturadas',
        ])->assertStatus(200);

        $this->assertDatabaseHas('attendance_audit_logs', [
            'auditable_type' => PayPeriod::class,
            'auditable_id' => $payPeriod->id,
            'action' => 'UPDATE',
            'user_id' => $this->admin->id,
            'reason' => 'Corrección de horas extra mal capturadas',
        ]);
    }

    public function test_manager_cannot_reopen_a_period(): void
    {
        $manager = User::factory()->create();
        $manager->assignRole('manager');
        Passport::actingAs($manager);

        $payPeriod = $this->createClosedPeriod();

        $this->patchJson("/api/v1/pay-periods/{$payPeriod->public_id}/reopen", [
            'reason' => 'Intento no autorizado',
        ])->assertStatus(403);

        $payPeriod->refresh();
        $this->assertEquals(PayPeriod::STATUS_CLOSED, $payPeriod->status);
    }

    public function test_reopen_requires_a_reason(): void
    {
        $payPeriod = $this->createClosedPeriod();

        $this->patchJson("/api/v1/pay-periods/{$payPeriod->public_id}/reopen", [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['reason']);
    }

    public function test_reopen_rejects_a_period_that_is_not_closed(): void
    {
        $payPeriod = PayPeriod::create([
            'branch_id' => $this->branch->id,
            'period_start' => '2026-06-22',
            'period_end' => '2026-06-28',
            'status' => PayPeriod::STATUS_OPEN,
        ]);

        $this->patchJson("/api/v1/pay-periods/{$payPeriod->public_id}/reopen", [
            'reason' => 'Intento inválido',
        ])->assertStatus(422);
    }

    public function test_reopen_returns_404_for_unknown_period(): void
    {
        $this->patchJson('/api/v1/pay-periods/01JUNKNOWNULIDDOESNOTEXIST/reopen', [
            'reason' => 'No existe',
        ])->assertStatus(404);
    }
}
