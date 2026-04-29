<?php

namespace Tests\Feature\Punctuality;

use App\Models\PunctualityBonusGroup;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class PunctualityBonusGroupsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        Permission::create(['name' => 'punctuality.manage', 'guard_name' => 'api']);
        $admin = Role::create(['name' => 'admin', 'guard_name' => 'api']);
        $admin->givePermissionTo('punctuality.manage');

        PunctualityBonusGroup::insert([
            ['public_id' => '01A', 'name' => 'Grupo $110', 'weekly_bonus_amount' => '110.00', 'working_days_divisor' => 6, 'is_active' => true,  'created_at' => now(), 'updated_at' => now()],
            ['public_id' => '01B', 'name' => 'Grupo $100', 'weekly_bonus_amount' => '100.00', 'working_days_divisor' => 6, 'is_active' => true,  'created_at' => now(), 'updated_at' => now()],
            ['public_id' => '01C', 'name' => 'Grupo $50',  'weekly_bonus_amount' => '50.00',  'working_days_divisor' => 3, 'is_active' => false, 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    private function adminUser(): User
    {
        $user = User::factory()->create();
        $user->assignRole('admin');

        return $user;
    }

    // ── GET /api/v1/punctuality/bonus-groups ───────────────────────────────────

    #[Test]
    public function admin_can_list_active_bonus_groups(): void
    {
        Passport::actingAs($this->adminUser());

        $response = $this->getJson('/api/v1/punctuality/bonus-groups');

        $response->assertOk()
            ->assertJsonCount(2, 'data');
    }

    #[Test]
    public function list_response_includes_computed_daily_amount(): void
    {
        Passport::actingAs($this->adminUser());

        $response = $this->getJson('/api/v1/punctuality/bonus-groups');

        $data = $response->json('data');
        $group110 = collect($data)->firstWhere('name', 'Grupo $110');

        $this->assertNotNull($group110);
        $this->assertSame(18.33, $group110['daily_bonus_amount']);
    }

    #[Test]
    public function inactive_groups_are_excluded_from_list(): void
    {
        Passport::actingAs($this->adminUser());

        $response = $this->getJson('/api/v1/punctuality/bonus-groups');

        $names = array_column($response->json('data'), 'name');
        $this->assertNotContains('Grupo $50', $names);
    }

    #[Test]
    public function unauthenticated_cannot_list_bonus_groups(): void
    {
        $this->getJson('/api/v1/punctuality/bonus-groups')->assertUnauthorized();
    }

    #[Test]
    public function user_without_permission_cannot_list_bonus_groups(): void
    {
        Passport::actingAs(User::factory()->create());
        $this->getJson('/api/v1/punctuality/bonus-groups')->assertForbidden();
    }

    // ── POST /api/v1/punctuality/bonus-groups ─────────────────────────────────

    #[Test]
    public function admin_can_create_bonus_group(): void
    {
        Passport::actingAs($this->adminUser());

        $response = $this->postJson('/api/v1/punctuality/bonus-groups', [
            'name' => 'Grupo $80 (÷5)',
            'weekly_bonus_amount' => 80.00,
            'working_days_divisor' => 5,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.name', 'Grupo $80 (÷5)')
            ->assertJsonPath('data.weekly_bonus_amount', 80)
            ->assertJsonPath('data.working_days_divisor', 5)
            ->assertJsonPath('data.daily_bonus_amount', 16)
            ->assertJsonPath('data.is_active', true);

        $this->assertDatabaseHas('punctuality_bonus_groups', [
            'name' => 'Grupo $80 (÷5)',
            'weekly_bonus_amount' => '80.00',
            'working_days_divisor' => 5,
            'is_active' => true,
        ]);
    }

    #[Test]
    public function create_rejects_missing_name(): void
    {
        Passport::actingAs($this->adminUser());

        $this->postJson('/api/v1/punctuality/bonus-groups', [
            'weekly_bonus_amount' => 100.00,
            'working_days_divisor' => 6,
        ])->assertUnprocessable();
    }

    #[Test]
    public function create_rejects_name_exceeding_50_chars(): void
    {
        Passport::actingAs($this->adminUser());

        $this->postJson('/api/v1/punctuality/bonus-groups', [
            'name' => str_repeat('x', 51),
            'weekly_bonus_amount' => 100.00,
            'working_days_divisor' => 6,
        ])->assertUnprocessable();
    }

    #[Test]
    public function create_rejects_zero_weekly_amount(): void
    {
        Passport::actingAs($this->adminUser());

        $this->postJson('/api/v1/punctuality/bonus-groups', [
            'name' => 'Test',
            'weekly_bonus_amount' => 0,
            'working_days_divisor' => 6,
        ])->assertUnprocessable();
    }

    #[Test]
    public function create_rejects_zero_divisor(): void
    {
        Passport::actingAs($this->adminUser());

        $this->postJson('/api/v1/punctuality/bonus-groups', [
            'name' => 'Test',
            'weekly_bonus_amount' => 100.00,
            'working_days_divisor' => 0,
        ])->assertUnprocessable();
    }

    #[Test]
    public function unauthenticated_cannot_create_bonus_group(): void
    {
        $this->postJson('/api/v1/punctuality/bonus-groups', [
            'name' => 'Test',
            'weekly_bonus_amount' => 100.00,
            'working_days_divisor' => 6,
        ])->assertUnauthorized();
    }

    #[Test]
    public function user_without_permission_cannot_create_bonus_group(): void
    {
        Passport::actingAs(User::factory()->create());

        $this->postJson('/api/v1/punctuality/bonus-groups', [
            'name' => 'Test',
            'weekly_bonus_amount' => 100.00,
            'working_days_divisor' => 6,
        ])->assertForbidden();
    }
}
