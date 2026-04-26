<?php

namespace Tests\Feature\NegotiatedExtraDay;

use App\Models\Employee;
use App\Models\EmployeeRequest;
use App\Models\NegotiatedExtraDay;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class CancelNegotiatedExtraDayTest extends TestCase
{
    use RefreshDatabase;

    protected User $manager;

    /** A Sunday in the future — safe as a rest-day date */
    private const FUTURE_DATE = '2026-05-10';

    /** A past Sunday — should be rejected */
    private const PAST_DATE = '2026-03-15';

    protected function setUp(): void
    {
        parent::setUp();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        foreach (Employee::POSITION_ROLES as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);
        }
        Role::firstOrCreate(['name' => 'employee', 'guard_name' => 'api']);
        Role::firstOrCreate(['name' => 'employee-manager', 'guard_name' => 'api']);

        Permission::firstOrCreate(['name' => 'employee-requests.approve', 'guard_name' => 'api']);
        Permission::firstOrCreate(['name' => 'employee-requests.cancel', 'guard_name' => 'api']);
        $role = Role::firstOrCreate(['name' => 'manager', 'guard_name' => 'api']);
        $role->givePermissionTo(['employee-requests.approve', 'employee-requests.cancel']);

        $this->manager = User::factory()->create();
        $this->manager->assignRole('manager');

        Passport::actingAs($this->manager);
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private function makeRecord(string $date): NegotiatedExtraDay
    {
        return NegotiatedExtraDay::factory()->create([
            'date' => $date,
            'approved_by' => $this->manager->id,
        ]);
    }

    private function url(NegotiatedExtraDay $record): string
    {
        return "/api/v1/negotiated-extra-days/{$record->public_id}";
    }

    // ── Tests ──────────────────────────────────────────────────────────────────

    #[Test]
    public function cancels_future_negotiated_extra_day(): void
    {
        Carbon::setTestNow('2026-04-26');

        $record = $this->makeRecord(self::FUTURE_DATE);

        $this->deleteJson($this->url($record))
            ->assertOk()
            ->assertJsonPath('status', 'ok');

        $this->assertSoftDeleted('negotiated_extra_days', ['id' => $record->id]);
    }

    #[Test]
    public function also_cancels_linked_employee_request_when_present(): void
    {
        Carbon::setTestNow('2026-04-26');

        $record = NegotiatedExtraDay::factory()->create([
            'date' => self::FUTURE_DATE,
            'approved_by' => $this->manager->id,
        ]);
        $employee = $record->employee;

        // Simulate a linked EmployeeRequest (auto-approved flow)
        $empRequest = EmployeeRequest::create([
            'employee_id' => $employee->id,
            'type' => 'EXTRA_DAY',
            'status' => 'APPROVED',
            'payload' => json_encode(['date' => self::FUTURE_DATE]),
            'requested_by' => $this->manager->id,
            'approved_by' => $this->manager->id,
            'approved_at' => now(),
            'requestable_type' => NegotiatedExtraDay::class,
            'requestable_id' => $record->id,
        ]);
        $record->update(['request_id' => $empRequest->id]);

        $this->deleteJson($this->url($record))->assertOk();

        $this->assertSoftDeleted('negotiated_extra_days', ['id' => $record->id]);
        $this->assertDatabaseHas('employee_requests', [
            'id' => $empRequest->id,
            'status' => 'CANCELLED',
        ]);
    }

    #[Test]
    public function rejects_cancellation_of_past_day_with_422(): void
    {
        Carbon::setTestNow('2026-04-26');

        $record = $this->makeRecord(self::PAST_DATE);

        $this->deleteJson($this->url($record))
            ->assertUnprocessable()
            ->assertJsonValidationErrorFor('date');

        $this->assertNotSoftDeleted('negotiated_extra_days', ['id' => $record->id]);
    }

    #[Test]
    public function returns_404_for_unknown_id(): void
    {
        $this->deleteJson('/api/v1/negotiated-extra-days/01JNOT_EXIST0000000000000')
            ->assertNotFound();
    }

    #[Test]
    public function returns_401_when_unauthenticated(): void
    {
        $record = $this->makeRecord(self::FUTURE_DATE);

        auth()->forgetGuards();

        $this->deleteJson($this->url($record))->assertUnauthorized();
    }

    #[Test]
    public function returns_403_when_user_lacks_permission(): void
    {
        Carbon::setTestNow('2026-04-26');

        $record = $this->makeRecord(self::FUTURE_DATE);

        $noPermUser = User::factory()->create();
        Passport::actingAs($noPermUser);

        $this->deleteJson($this->url($record))->assertForbidden();
    }
}
