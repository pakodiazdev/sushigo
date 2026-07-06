<?php

namespace Tests\Feature\Overtime;

use App\Models\OvertimeLftTier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class OvertimeLftTiersTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        Permission::create(['name' => 'overtime.manage', 'guard_name' => 'api']);
        $admin = Role::create(['name' => 'admin', 'guard_name' => 'api']);
        $admin->givePermissionTo('overtime.manage');

        OvertimeLftTier::insert([
            ['public_id' => '01A', 'factor' => '2.00', 'up_to_hours' => '9.00', 'sort_order' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['public_id' => '01B', 'factor' => '3.00', 'up_to_hours' => null, 'sort_order' => 2, 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    private function adminUser(): User
    {
        $user = User::factory()->create();
        $user->assignRole('admin');

        return $user;
    }

    // ── GET /api/v1/overtime/lft-tiers ──────────────────────────────────────────

    #[Test]
    public function admin_can_list_tiers(): void
    {
        Passport::actingAs($this->adminUser());

        $response = $this->getJson('/api/v1/overtime/lft-tiers');

        $response->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.sort_order', 1)
            ->assertJsonPath('data.0.factor', 2)
            ->assertJsonPath('data.1.up_to_hours', null);
    }

    #[Test]
    public function unauthenticated_cannot_list_tiers(): void
    {
        $this->getJson('/api/v1/overtime/lft-tiers')->assertUnauthorized();
    }

    #[Test]
    public function user_without_permission_cannot_list_tiers(): void
    {
        Passport::actingAs(User::factory()->create());
        $this->getJson('/api/v1/overtime/lft-tiers')->assertForbidden();
    }

    // ── PUT /api/v1/overtime/lft-tiers — happy path ─────────────────────────────

    #[Test]
    public function admin_can_replace_all_tiers(): void
    {
        Passport::actingAs($this->adminUser());

        $response = $this->putJson('/api/v1/overtime/lft-tiers', [
            'tiers' => [
                ['factor' => 2, 'up_to_hours' => 9],
                ['factor' => 3, 'up_to_hours' => null],
            ],
        ]);

        $response->assertOk()->assertJsonCount(2, 'data');

        $this->assertDatabaseCount('overtime_lft_tiers', 2);
        $this->assertDatabaseHas('overtime_lft_tiers', ['factor' => 2, 'up_to_hours' => 9, 'sort_order' => 1]);
        $this->assertDatabaseHas('overtime_lft_tiers', ['factor' => 3, 'up_to_hours' => null, 'sort_order' => 2]);
    }

    #[Test]
    public function admin_can_simplify_to_a_single_unbounded_tier(): void
    {
        Passport::actingAs($this->adminUser());

        $this->putJson('/api/v1/overtime/lft-tiers', [
            'tiers' => [['factor' => 2, 'up_to_hours' => null]],
        ])->assertOk()->assertJsonCount(1, 'data');

        $this->assertDatabaseCount('overtime_lft_tiers', 1);
        $this->assertDatabaseHas('overtime_lft_tiers', ['factor' => 2, 'up_to_hours' => null]);
    }

    #[Test]
    public function request_is_sorted_server_side_regardless_of_input_order(): void
    {
        Passport::actingAs($this->adminUser());

        $response = $this->putJson('/api/v1/overtime/lft-tiers', [
            'tiers' => [
                ['factor' => 3, 'up_to_hours' => null],
                ['factor' => 2, 'up_to_hours' => 9],
            ],
        ])->assertOk();

        $data = $response->json('data');
        $this->assertSame([9, null], array_column($data, 'up_to_hours'));
        $this->assertSame([1, 2], array_column($data, 'sort_order'));
    }

    // ── PUT — validation ────────────────────────────────────────────────────────

    #[Test]
    public function update_rejects_missing_tiers_array(): void
    {
        Passport::actingAs($this->adminUser());
        $this->putJson('/api/v1/overtime/lft-tiers', [])->assertUnprocessable();
    }

    #[Test]
    public function update_rejects_empty_tiers_array(): void
    {
        Passport::actingAs($this->adminUser());
        $this->putJson('/api/v1/overtime/lft-tiers', ['tiers' => []])->assertUnprocessable();
    }

    #[Test]
    public function update_rejects_more_than_one_unbounded_tier(): void
    {
        Passport::actingAs($this->adminUser());

        $this->putJson('/api/v1/overtime/lft-tiers', [
            'tiers' => [
                ['factor' => 2, 'up_to_hours' => null],
                ['factor' => 3, 'up_to_hours' => null],
            ],
        ])->assertUnprocessable();
    }

    #[Test]
    public function update_rejects_duplicate_up_to_hours(): void
    {
        Passport::actingAs($this->adminUser());

        $this->putJson('/api/v1/overtime/lft-tiers', [
            'tiers' => [
                ['factor' => 2, 'up_to_hours' => 9],
                ['factor' => 2.5, 'up_to_hours' => 9],
            ],
        ])->assertUnprocessable();
    }

    #[Test]
    public function update_rejects_zero_or_negative_factor(): void
    {
        Passport::actingAs($this->adminUser());

        $this->putJson('/api/v1/overtime/lft-tiers', [
            'tiers' => [['factor' => 0, 'up_to_hours' => null]],
        ])->assertUnprocessable();
    }

    #[Test]
    public function unauthenticated_cannot_update_tiers(): void
    {
        $this->putJson('/api/v1/overtime/lft-tiers', [
            'tiers' => [['factor' => 2, 'up_to_hours' => null]],
        ])->assertUnauthorized();
    }

    #[Test]
    public function user_without_permission_cannot_update_tiers(): void
    {
        Passport::actingAs(User::factory()->create());

        $this->putJson('/api/v1/overtime/lft-tiers', [
            'tiers' => [['factor' => 2, 'up_to_hours' => null]],
        ])->assertForbidden();
    }
}
