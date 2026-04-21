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

    #[Test]
    public function it_lists_employee_requests_with_pagination(): void
    {
        $employee = $this->makeEmployeeWithActivePeriod();

        // Create multiple requests
        for ($i = 0; $i < 3; $i++) {
            $this->postJson('/api/v1/employee-requests', [
                'employee_id' => $employee->public_id,
                'type' => EmployeeRequestType::EXTRA_DAY->value,
                'payload' => $this->extraDayPayload(),
            ])->assertStatus(201);
        }

        $response = $this->getJson('/api/v1/employee-requests?per_page=2');

        $response->assertOk()
            ->assertJsonPath('meta.total', 3)
            ->assertJsonPath('meta.per_page', 2)
            ->assertJsonCount(2, 'data');
    }

    #[Test]
    public function it_lists_employee_requests_filtered_by_employee_id(): void
    {
        $employee1 = $this->makeEmployeeWithActivePeriod();
        $employee2 = $this->makeEmployeeWithActivePeriod();

        $this->postJson('/api/v1/employee-requests', [
            'employee_id' => $employee1->public_id,
            'type' => EmployeeRequestType::EXTRA_DAY->value,
            'payload' => $this->extraDayPayload(),
        ])->assertStatus(201);

        $this->postJson('/api/v1/employee-requests', [
            'employee_id' => $employee2->public_id,
            'type' => EmployeeRequestType::EXTRA_DAY->value,
            'payload' => $this->extraDayPayload(),
        ])->assertStatus(201);

        $response = $this->getJson("/api/v1/employee-requests?employee_id={$employee1->public_id}");

        $response->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.employee_id', $employee1->public_id);
    }

    #[Test]
    public function it_lists_employee_requests_filtered_by_status(): void
    {
        $employee = $this->makeEmployeeWithActivePeriod();

        // Create one request and approve it
        $approvedResponse = $this->postJson('/api/v1/employee-requests', [
            'employee_id' => $employee->public_id,
            'type' => EmployeeRequestType::EXTRA_DAY->value,
            'payload' => $this->extraDayPayload(),
        ])->assertStatus(201);
        $approvedId = $approvedResponse->json('data.id');
        $this->patchJson("/api/v1/employee-requests/{$approvedId}/approve")->assertOk();

        // Create another request and leave it pending
        $this->postJson('/api/v1/employee-requests', [
            'employee_id' => $employee->public_id,
            'type' => EmployeeRequestType::EXTRA_DAY->value,
            'payload' => $this->extraDayPayload(),
        ])->assertStatus(201);

        $response = $this->getJson('/api/v1/employee-requests?status='.EmployeeRequestStatus::APPROVED->value);

        $response->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.status', EmployeeRequestStatus::APPROVED->value);
    }

    #[Test]
    public function it_lists_employee_requests_filtered_by_type(): void
    {
        $employee = $this->makeEmployeeWithActivePeriod();

        $this->postJson('/api/v1/employee-requests', [
            'employee_id' => $employee->public_id,
            'type' => EmployeeRequestType::EXTRA_DAY->value,
            'payload' => $this->extraDayPayload(),
        ])->assertStatus(201);

        $response = $this->getJson('/api/v1/employee-requests?type='.EmployeeRequestType::EXTRA_DAY->value);

        $response->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.type', EmployeeRequestType::EXTRA_DAY->value);
    }

    #[Test]
    public function it_enforces_view_permission_on_list(): void
    {
        $noPermissionUser = User::factory()->createOne();
        assert($noPermissionUser instanceof User);
        Passport::actingAs($noPermissionUser);

        $this->getJson('/api/v1/employee-requests')
            ->assertStatus(403);
    }

    #[Test]
    public function it_validates_required_fields_on_create(): void
    {
        $employee = $this->makeEmployeeWithActivePeriod();

        $response = $this->postJson('/api/v1/employee-requests', [
            'employee_id' => $employee->public_id,
            // Missing 'type' and 'payload'
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrorFor('type')
            ->assertJsonValidationErrorFor('payload');
    }

    #[Test]
    public function it_validates_employee_exists_on_create(): void
    {
        $response = $this->postJson('/api/v1/employee-requests', [
            'employee_id' => 'invalid-id',
            'type' => EmployeeRequestType::EXTRA_DAY->value,
            'payload' => $this->extraDayPayload(),
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrorFor('employee_id');
    }

    #[Test]
    public function it_validates_invalid_type_on_create(): void
    {
        $employee = $this->makeEmployeeWithActivePeriod();

        $response = $this->postJson('/api/v1/employee-requests', [
            'employee_id' => $employee->public_id,
            'type' => 'invalid-type',
            'payload' => $this->extraDayPayload(),
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrorFor('type');
    }

    #[Test]
    public function it_validates_payload_required_fields(): void
    {
        $employee = $this->makeEmployeeWithActivePeriod();

        $response = $this->postJson('/api/v1/employee-requests', [
            'employee_id' => $employee->public_id,
            'type' => EmployeeRequestType::EXTRA_DAY->value,
            'payload' => [
                'date' => self::DATE,
                // Missing other required fields
            ],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrorFor('payload.salary_pct')
            ->assertJsonValidationErrorFor('payload.prima_pct');
    }

    #[Test]
    public function it_validates_invalid_date_format_in_payload(): void
    {
        $employee = $this->makeEmployeeWithActivePeriod();

        $response = $this->postJson('/api/v1/employee-requests', [
            'employee_id' => $employee->public_id,
            'type' => EmployeeRequestType::EXTRA_DAY->value,
            'payload' => array_merge($this->extraDayPayload(), [
                'date' => 'invalid-date',
            ]),
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrorFor('payload.date');
    }

    #[Test]
    public function it_returns_404_when_rejecting_nonexistent_request(): void
    {
        $response = $this->patchJson('/api/v1/employee-requests/nonexistent-id/reject', [
            'reason' => 'Test reason',
        ]);

        $response->assertStatus(404);
    }

    #[Test]
    public function it_returns_404_when_approving_nonexistent_request(): void
    {
        $response = $this->patchJson('/api/v1/employee-requests/nonexistent-id/approve');

        $response->assertStatus(404);
    }

    #[Test]
    public function it_prevents_approving_already_approved_request(): void
    {
        $employee = $this->makeEmployeeWithActivePeriod();

        $createResponse = $this->postJson('/api/v1/employee-requests', [
            'employee_id' => $employee->public_id,
            'type' => EmployeeRequestType::EXTRA_DAY->value,
            'payload' => $this->extraDayPayload(),
        ])->assertStatus(201);

        $requestId = $createResponse->json('data.id');

        // First approval
        $this->patchJson("/api/v1/employee-requests/{$requestId}/approve")->assertOk();

        // Try to approve again
        $response = $this->patchJson("/api/v1/employee-requests/{$requestId}/approve");

        $response->assertStatus(422);
    }

    #[Test]
    public function it_prevents_rejecting_already_approved_request(): void
    {
        $employee = $this->makeEmployeeWithActivePeriod();

        $createResponse = $this->postJson('/api/v1/employee-requests', [
            'employee_id' => $employee->public_id,
            'type' => EmployeeRequestType::EXTRA_DAY->value,
            'payload' => $this->extraDayPayload(),
        ])->assertStatus(201);

        $requestId = $createResponse->json('data.id');

        // Approve first
        $this->patchJson("/api/v1/employee-requests/{$requestId}/approve")->assertOk();

        // Try to reject
        $response = $this->patchJson("/api/v1/employee-requests/{$requestId}/reject", [
            'reason' => 'Too late',
        ]);

        $response->assertStatus(422);
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
