<?php

namespace Tests\Feature\AttendancePayroll;

use App\Enums\OvertimeMovementType;
use App\Enums\OvertimeOrigin;
use App\Models\Employee;
use App\Models\OvertimeBankMovement;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class ManualOvertimeMovementApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        Permission::create(['name' => 'employees.view', 'guard_name' => 'api']);
        Permission::create(['name' => 'employees.update', 'guard_name' => 'api']);
        Permission::create(['name' => 'employee-requests.create', 'guard_name' => 'api']);

        $adminRole = Role::create(['name' => 'admin', 'guard_name' => 'api']);
        $adminRole->givePermissionTo(['employees.view', 'employees.update']);

        $selfServiceRole = Role::create(['name' => 'employee', 'guard_name' => 'api']);
        $selfServiceRole->givePermissionTo('employee-requests.create');

        foreach (Employee::POSITION_ROLES as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);
        }

        $this->admin = User::factory()->create();
        $this->admin->assignRole('admin');

        Passport::actingAs($this->admin);
    }

    private function endpoint(Employee $employee): string
    {
        return "/api/v1/employees/{$employee->public_id}/overtime-bank/movements";
    }

    #[Test]
    public function admin_can_register_a_used_movement(): void
    {
        $employee = Employee::factory()->create();

        OvertimeBankMovement::factory()->earned()->create([
            'employee_id' => $employee->id,
            'minutes' => 120,
        ]);

        $response = $this->postJson($this->endpoint($employee), [
            'date' => '2026-07-13',
            'minutes' => 60,
            'movement_type' => 'USED',
            'reason' => 'Redeemed for time off',
        ]);

        $response->assertStatus(201);
        $this->assertSame('USED', $response->json('data.movement_type'));
        $this->assertSame('MANUAL', $response->json('data.origin'));
        $this->assertSame(60, $response->json('data.minutes'));
        $this->assertSame($this->admin->name, $response->json('data.authorized_by'));
        $this->assertSame('Redeemed for time off', $response->json('data.reason'));

        $this->assertDatabaseHas('overtime_bank_movements', [
            'employee_id' => $employee->id,
            'movement_type' => OvertimeMovementType::USED->value,
            'origin' => OvertimeOrigin::MANUAL->value,
            'minutes' => 60,
            'authorized_by' => $this->admin->id,
        ]);
    }

    #[Test]
    public function admin_can_register_a_positive_adjustment_movement(): void
    {
        $employee = Employee::factory()->create();

        $response = $this->postJson($this->endpoint($employee), [
            'date' => '2026-07-13',
            'minutes' => 45,
            'movement_type' => 'ADJUSTMENT',
            'reason' => 'Correcting under-counted balance',
        ]);

        $response->assertStatus(201);
        $this->assertSame(45, $response->json('data.minutes'));

        $balance = $this->getJson("/api/v1/employees/{$employee->public_id}/overtime-bank");
        $this->assertSame(45, $balance->json('meta.balance_minutes'));
    }

    #[Test]
    public function admin_can_register_a_negative_adjustment_movement(): void
    {
        $employee = Employee::factory()->create();

        OvertimeBankMovement::factory()->earned()->create([
            'employee_id' => $employee->id,
            'minutes' => 120,
        ]);

        $response = $this->postJson($this->endpoint($employee), [
            'date' => '2026-07-13',
            'minutes' => -30,
            'movement_type' => 'ADJUSTMENT',
            'reason' => 'Correcting over-counted balance',
        ]);

        $response->assertStatus(201);
        $this->assertSame(-30, $response->json('data.minutes'));

        $balance = $this->getJson("/api/v1/employees/{$employee->public_id}/overtime-bank");
        $this->assertSame(90, $balance->json('meta.balance_minutes'));
    }

    #[Test]
    public function used_movement_is_rejected_when_balance_would_go_negative(): void
    {
        $employee = Employee::factory()->create();

        OvertimeBankMovement::factory()->earned()->create([
            'employee_id' => $employee->id,
            'minutes' => 30,
        ]);

        $response = $this->postJson($this->endpoint($employee), [
            'date' => '2026-07-13',
            'minutes' => 60,
            'movement_type' => 'USED',
            'reason' => 'Attempting to redeem more than available',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['minutes']);

        $this->assertDatabaseMissing('overtime_bank_movements', [
            'employee_id' => $employee->id,
            'movement_type' => OvertimeMovementType::USED->value,
        ]);
    }

    #[Test]
    public function it_validates_required_fields(): void
    {
        $employee = Employee::factory()->create();

        $response = $this->postJson($this->endpoint($employee), []);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['date', 'minutes', 'movement_type', 'reason']);
    }

    #[Test]
    public function it_rejects_earned_and_paid_movement_types(): void
    {
        $employee = Employee::factory()->create();

        $response = $this->postJson($this->endpoint($employee), [
            'date' => '2026-07-13',
            'minutes' => 60,
            'movement_type' => 'EARNED',
            'reason' => 'Should not be allowed manually',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['movement_type']);
    }

    #[Test]
    public function it_returns_403_for_user_without_employees_update_permission(): void
    {
        $employee = Employee::factory()->create();
        Passport::actingAs(User::factory()->create());

        $response = $this->postJson($this->endpoint($employee), [
            'date' => '2026-07-13',
            'minutes' => 60,
            'movement_type' => 'ADJUSTMENT',
            'reason' => 'Should be forbidden',
        ]);

        $response->assertStatus(403);
    }
}
