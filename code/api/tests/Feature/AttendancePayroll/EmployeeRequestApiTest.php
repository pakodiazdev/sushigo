<?php

namespace Tests\Feature\AttendancePayroll;

use App\Enums\EmployeeRequestStatus;
use App\Enums\EmployeeRequestType;
use App\Models\Employee;
use App\Models\EmploymentPeriod;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class EmployeeRequestApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $manager;

    private const DATE = '2026-04-21';

    protected function setUp(): void
    {
        parent::setUp();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        Permission::create(['name' => 'employee-requests.view', 'guard_name' => 'api']);
        Permission::create(['name' => 'employee-requests.create', 'guard_name' => 'api']);
        Permission::create(['name' => 'employee-requests.approve', 'guard_name' => 'api']);

        $managerRole = Role::create(['name' => 'manager', 'guard_name' => 'api']);
        $managerRole->givePermissionTo('employee-requests.view');
        $managerRole->givePermissionTo('employee-requests.create');
        $managerRole->givePermissionTo('employee-requests.approve');

        Role::firstOrCreate(['name' => 'employee', 'guard_name' => 'api']);
        foreach (Employee::POSITION_ROLES as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);
        }

        $this->manager = User::factory()->create();
        $this->manager->assignRole('manager');

        Passport::actingAs($this->manager);

        Carbon::setTestNow(Carbon::parse(self::DATE.' 10:00:00'));
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    #[Test]
    public function it_creates_pending_employee_request_and_approves_it(): void
    {
        $employee = $this->makeEmployeeWithActivePeriod();

        $createResponse = $this->postJson('/api/v1/employee-requests', [
            'employee_id' => $employee->public_id,
            'type' => EmployeeRequestType::EXTRA_DAY->value,
            'payload' => $this->extraDayPayload(),
        ]);

        $createResponse->assertStatus(201)
            ->assertJsonPath('data.status', EmployeeRequestStatus::PENDING->value)
            ->assertJsonPath('data.requestable', null);

        $requestId = $createResponse->json('data.id');

        $approveResponse = $this->patchJson("/api/v1/employee-requests/{$requestId}/approve");

        $approveResponse->assertOk()
            ->assertJsonPath('data.status', EmployeeRequestStatus::APPROVED->value);

        $requestDbId = (int) $this->assertDatabaseHasAndReturnId('employee_requests', [
            'public_id' => $requestId,
            'status' => EmployeeRequestStatus::APPROVED->value,
            'approved_by' => $this->manager->id,
        ]);

        $this->assertDatabaseHas('negotiated_extra_days', [
            'employee_id' => $employee->id,
            'request_id' => $requestDbId,
            'date' => self::DATE,
        ]);
    }

    #[Test]
    public function it_rejects_request_without_creating_concrete_entity(): void
    {
        $employee = $this->makeEmployeeWithActivePeriod();

        $createResponse = $this->postJson('/api/v1/employee-requests', [
            'employee_id' => $employee->public_id,
            'type' => EmployeeRequestType::EXTRA_DAY->value,
            'payload' => $this->extraDayPayload(),
        ]);

        $requestId = $createResponse->json('data.id');

        $rejectResponse = $this->patchJson("/api/v1/employee-requests/{$requestId}/reject", [
            'reason' => 'No procede por política interna.',
        ]);

        $rejectResponse->assertOk()
            ->assertJsonPath('data.status', EmployeeRequestStatus::REJECTED->value)
            ->assertJsonPath('data.requestable', null);

        $this->assertDatabaseHas('employee_requests', [
            'public_id' => $requestId,
            'status' => EmployeeRequestStatus::REJECTED->value,
        ]);

        $this->assertDatabaseMissing('negotiated_extra_days', [
            'employee_id' => $employee->id,
            'date' => self::DATE,
        ]);
    }

    #[Test]
    public function it_rejects_duplicate_extra_day_when_auto_approving(): void
    {
        $employee = $this->makeEmployeeWithActivePeriod();

        $this->postJson('/api/v1/employee-requests', [
            'employee_id' => $employee->public_id,
            'type' => EmployeeRequestType::EXTRA_DAY->value,
            'payload' => $this->extraDayPayload(),
            'auto_approve' => true,
        ])->assertStatus(201);

        $duplicateResponse = $this->postJson('/api/v1/employee-requests', [
            'employee_id' => $employee->public_id,
            'type' => EmployeeRequestType::EXTRA_DAY->value,
            'payload' => $this->extraDayPayload(),
            'auto_approve' => true,
        ]);

        $duplicateResponse->assertStatus(422)
            ->assertJsonValidationErrorFor('payload.date');
    }

    #[Test]
    public function it_enforces_permissions_for_create_and_approve(): void
    {
        $employee = $this->makeEmployeeWithActivePeriod();

        $noPermissionUser = User::factory()->createOne();
        assert($noPermissionUser instanceof User);
        Passport::actingAs($noPermissionUser);

        $this->postJson('/api/v1/employee-requests', [
            'employee_id' => $employee->public_id,
            'type' => EmployeeRequestType::EXTRA_DAY->value,
            'payload' => $this->extraDayPayload(),
        ])->assertStatus(403);

        Passport::actingAs($this->manager);
        $createResponse = $this->postJson('/api/v1/employee-requests', [
            'employee_id' => $employee->public_id,
            'type' => EmployeeRequestType::EXTRA_DAY->value,
            'payload' => $this->extraDayPayload(),
        ])->assertStatus(201);

        $requestId = $createResponse->json('data.id');

        $anotherUser = User::factory()->createOne();
        assert($anotherUser instanceof User);
        Passport::actingAs($anotherUser);

        $this->patchJson("/api/v1/employee-requests/{$requestId}/approve")
            ->assertStatus(403);
    }

    private function extraDayPayload(): array
    {
        return [
            'date' => self::DATE,
            'salary_pct' => 100,
            'prima_pct' => 100,
            'salary_day' => 200.00,
            'prima' => 200.00,
            'seventh_day' => 200.00,
            'total' => 600.00,
        ];
    }

    private function makeEmployeeWithActivePeriod(): Employee
    {
        $period = EmploymentPeriod::factory()->create([
            'is_active' => true,
            'start_date' => '2026-01-01',
            'end_date' => null,
        ]);

        return $period->employee;
    }

    private function assertDatabaseHasAndReturnId(string $table, array $attributes): string
    {
        $this->assertDatabaseHas($table, $attributes);

        $row = DB::table($table)
            ->where($attributes)
            ->first();

        return (string) $row->id;
    }
}
