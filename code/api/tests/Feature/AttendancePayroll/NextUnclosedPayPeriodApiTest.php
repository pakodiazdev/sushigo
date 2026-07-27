<?php

namespace Tests\Feature\AttendancePayroll;

use App\Models\Branch;
use App\Models\Employee;
use App\Models\PayPeriod;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class NextUnclosedPayPeriodApiTest extends TestCase
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

        // Fixed "now": Tuesday of the 2026-07-13..19 week.
        Carbon::setTestNow(Carbon::parse('2026-07-14 10:00:00', 'America/Mexico_City'));
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow(null);
        parent::tearDown();
    }

    private function createPeriod(string $start, string $end, string $status = PayPeriod::STATUS_CLOSED): PayPeriod
    {
        return PayPeriod::create([
            'branch_id' => $this->branch->id,
            'period_start' => $start,
            'period_end' => $end,
            'status' => $status,
            'closed_by' => $this->user->id,
            'closed_at' => now(),
        ]);
    }

    public function test_returns_current_week_when_branch_has_no_periods(): void
    {
        $response = $this->getJson("/api/v1/pay-periods/next-unclosed?branch_id={$this->branch->id}");

        $response->assertStatus(200);
        $response->assertJson([
            'data' => [
                'period_start' => '2026-07-13',
                'period_end' => '2026-07-19',
            ],
        ]);
    }

    public function test_returns_the_week_after_the_only_closed_period(): void
    {
        $this->createPeriod('2026-06-22', '2026-06-28');

        $response = $this->getJson("/api/v1/pay-periods/next-unclosed?branch_id={$this->branch->id}");

        $response->assertStatus(200);
        $response->assertJson([
            'data' => [
                'period_start' => '2026-06-29',
                'period_end' => '2026-07-05',
            ],
        ]);
    }

    public function test_finds_the_oldest_gap_when_a_newer_week_was_closed_out_of_order(): void
    {
        // 2026-06-15..21 closed normally. 2026-06-22..28 was then skipped, and 2026-06-29..07-05
        // was closed directly instead (nav-arrow out-of-order close) — the algorithm must not
        // skip past the older gap just because a newer period_start exists.
        $this->createPeriod('2026-06-15', '2026-06-21');
        $this->createPeriod('2026-06-29', '2026-07-05');

        $response = $this->getJson("/api/v1/pay-periods/next-unclosed?branch_id={$this->branch->id}");

        $response->assertStatus(200);
        $response->assertJson([
            'data' => [
                'period_start' => '2026-06-22',
                'period_end' => '2026-06-28',
            ],
        ]);
    }

    public function test_a_reopened_period_is_not_treated_as_a_gap(): void
    {
        // Any status (OPEN/CLOSED/REOPENED) counts as "this week has a row" for gap-finding
        // purposes — reopened periods have their own dedicated reclose flow
        // (ReclosePayPeriodController), which this action intentionally does not surface.
        $this->createPeriod('2026-06-22', '2026-06-28', PayPeriod::STATUS_REOPENED);
        $this->createPeriod('2026-06-29', '2026-07-05');

        $response = $this->getJson("/api/v1/pay-periods/next-unclosed?branch_id={$this->branch->id}");

        $response->assertStatus(200);
        $response->assertJson([
            'data' => [
                'period_start' => '2026-07-06',
                'period_end' => '2026-07-12',
            ],
        ]);
    }

    public function test_returns_422_without_a_branch_id(): void
    {
        $response = $this->getJson('/api/v1/pay-periods/next-unclosed');

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['branch_id']);
    }

    public function test_returns_403_without_the_required_permission(): void
    {
        $otherUser = User::factory()->create();
        Passport::actingAs($otherUser);

        $response = $this->getJson("/api/v1/pay-periods/next-unclosed?branch_id={$this->branch->id}");

        $response->assertStatus(403);
    }
}
