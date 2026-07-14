<?php

namespace Tests\Feature\AttendancePayroll;

use App\Models\User;
use App\Models\VacationPolicySetting;
use App\Models\VacationPolicyTier;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class VacationPolicySettingsApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        Permission::create(['name' => 'vacation-policy.manage', 'guard_name' => 'api']);
        $admin = Role::create(['name' => 'admin', 'guard_name' => 'api']);
        $admin->givePermissionTo('vacation-policy.manage');
    }

    private function adminUser(): User
    {
        $user = User::factory()->create();
        $user->assignRole('admin');

        return $user;
    }

    // ── GET /api/v1/vacation-policy ─────────────────────────────────────────────

    #[Test]
    public function it_defaults_to_lft_with_no_tiers_configured(): void
    {
        Passport::actingAs($this->adminUser());

        $response = $this->getJson('/api/v1/vacation-policy');

        $response->assertOk()
            ->assertJsonPath('data.active_rule_key', 'VacationsLFTMX')
            ->assertJsonPath('data.active_rule_label', 'LFT México 2022')
            ->assertJsonCount(0, 'data.tiers');
    }

    #[Test]
    public function it_lists_the_active_custom_policy_and_its_tiers(): void
    {
        VacationPolicySetting::query()->create(['active_rule_key' => 'CustomCompanyPolicy']);
        VacationPolicyTier::insert([
            ['public_id' => '01A', 'years_from' => 1, 'days' => 18, 'sort_order' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['public_id' => '01B', 'years_from' => 5, 'days' => 25, 'sort_order' => 2, 'created_at' => now(), 'updated_at' => now()],
        ]);

        Passport::actingAs($this->adminUser());

        $response = $this->getJson('/api/v1/vacation-policy');

        $response->assertOk()
            ->assertJsonPath('data.active_rule_key', 'CustomCompanyPolicy')
            ->assertJsonPath('data.active_rule_label', 'Política de la empresa')
            ->assertJsonCount(2, 'data.tiers')
            ->assertJsonPath('data.tiers.0.years_from', 1)
            ->assertJsonPath('data.tiers.1.days', 25);
    }

    #[Test]
    public function unauthenticated_cannot_view_settings(): void
    {
        $this->getJson('/api/v1/vacation-policy')->assertUnauthorized();
    }

    #[Test]
    public function user_without_permission_cannot_view_settings(): void
    {
        Passport::actingAs(User::factory()->create());
        $this->getJson('/api/v1/vacation-policy')->assertForbidden();
    }

    // ── PUT /api/v1/vacation-policy — happy path ────────────────────────────────

    #[Test]
    public function admin_can_switch_to_a_custom_policy_with_tiers(): void
    {
        Passport::actingAs($this->adminUser());

        $response = $this->putJson('/api/v1/vacation-policy', [
            'active_rule_key' => 'CustomCompanyPolicy',
            'tiers' => [
                ['years_from' => 1, 'days' => 18],
                ['years_from' => 5, 'days' => 25],
            ],
        ]);

        $response->assertOk()
            ->assertJsonPath('data.active_rule_key', 'CustomCompanyPolicy')
            ->assertJsonCount(2, 'data.tiers');

        $this->assertDatabaseCount('vacation_policy_tiers', 2);
        $this->assertDatabaseHas('vacation_policy_tiers', ['years_from' => 1, 'days' => 18, 'sort_order' => 1]);
        $this->assertDatabaseHas('vacation_policy_tiers', ['years_from' => 5, 'days' => 25, 'sort_order' => 2]);
        $this->assertSame('CustomCompanyPolicy', VacationPolicySetting::current()->active_rule_key);
    }

    #[Test]
    public function tiers_are_sorted_server_side_regardless_of_input_order(): void
    {
        Passport::actingAs($this->adminUser());

        $response = $this->putJson('/api/v1/vacation-policy', [
            'active_rule_key' => 'CustomCompanyPolicy',
            'tiers' => [
                ['years_from' => 5, 'days' => 25],
                ['years_from' => 1, 'days' => 18],
            ],
        ])->assertOk();

        $data = $response->json('data.tiers');
        $this->assertSame([1, 5], array_column($data, 'years_from'));
        $this->assertSame([1, 2], array_column($data, 'sort_order'));
    }

    #[Test]
    public function admin_can_switch_back_to_lft_without_sending_tiers(): void
    {
        VacationPolicySetting::query()->create(['active_rule_key' => 'CustomCompanyPolicy']);
        VacationPolicyTier::create(['years_from' => 1, 'days' => 18, 'sort_order' => 1]);

        Passport::actingAs($this->adminUser());

        $response = $this->putJson('/api/v1/vacation-policy', ['active_rule_key' => 'VacationsLFTMX']);

        $response->assertOk()->assertJsonPath('data.active_rule_key', 'VacationsLFTMX');
        $this->assertSame('VacationsLFTMX', VacationPolicySetting::current()->active_rule_key);
        // Existing custom tiers are preserved (not deleted) so re-enabling later keeps them.
        $this->assertDatabaseCount('vacation_policy_tiers', 1);
    }

    // ── PUT — validation ─────────────────────────────────────────────────────────

    #[Test]
    public function update_rejects_missing_active_rule_key(): void
    {
        Passport::actingAs($this->adminUser());
        $this->putJson('/api/v1/vacation-policy', [])->assertUnprocessable();
    }

    #[Test]
    public function update_rejects_unknown_active_rule_key(): void
    {
        Passport::actingAs($this->adminUser());

        $this->putJson('/api/v1/vacation-policy', ['active_rule_key' => 'SomethingElse'])
            ->assertUnprocessable();
    }

    #[Test]
    public function update_rejects_custom_policy_without_tiers(): void
    {
        Passport::actingAs($this->adminUser());

        $this->putJson('/api/v1/vacation-policy', ['active_rule_key' => 'CustomCompanyPolicy'])
            ->assertUnprocessable();
    }

    #[Test]
    public function update_rejects_duplicate_years_from(): void
    {
        Passport::actingAs($this->adminUser());

        $this->putJson('/api/v1/vacation-policy', [
            'active_rule_key' => 'CustomCompanyPolicy',
            'tiers' => [
                ['years_from' => 1, 'days' => 12],
                ['years_from' => 1, 'days' => 15],
            ],
        ])->assertUnprocessable();
    }

    #[Test]
    public function update_rejects_non_positive_years_from_or_negative_days(): void
    {
        Passport::actingAs($this->adminUser());

        $this->putJson('/api/v1/vacation-policy', [
            'active_rule_key' => 'CustomCompanyPolicy',
            'tiers' => [['years_from' => 0, 'days' => -1]],
        ])->assertUnprocessable();
    }

    #[Test]
    public function unauthenticated_cannot_update_settings(): void
    {
        $this->putJson('/api/v1/vacation-policy', ['active_rule_key' => 'VacationsLFTMX'])
            ->assertUnauthorized();
    }

    #[Test]
    public function user_without_permission_cannot_update_settings(): void
    {
        Passport::actingAs(User::factory()->create());

        $this->putJson('/api/v1/vacation-policy', ['active_rule_key' => 'VacationsLFTMX'])
            ->assertForbidden();
    }
}
