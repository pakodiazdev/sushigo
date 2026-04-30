<?php

namespace Tests\Feature\Punctuality;

use App\Models\PunctualityRange;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class PunctualityRangesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        Permission::create(['name' => 'punctuality.manage', 'guard_name' => 'api']);
        $admin = Role::create(['name' => 'admin', 'guard_name' => 'api']);
        $admin->givePermissionTo('punctuality.manage');

        PunctualityRange::insert([
            ['public_id' => '01A', 'min_seconds' => 0,    'max_seconds' => 599,  'bonus_percentage' => '100.00', 'sort_order' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['public_id' => '01B', 'min_seconds' => 600,  'max_seconds' => 899,  'bonus_percentage' => '50.00',  'sort_order' => 2, 'created_at' => now(), 'updated_at' => now()],
            ['public_id' => '01C', 'min_seconds' => 900,  'max_seconds' => 1259, 'bonus_percentage' => '25.00',  'sort_order' => 3, 'created_at' => now(), 'updated_at' => now()],
            ['public_id' => '01D', 'min_seconds' => 1260, 'max_seconds' => 1559, 'bonus_percentage' => '10.00',  'sort_order' => 4, 'created_at' => now(), 'updated_at' => now()],
            ['public_id' => '01E', 'min_seconds' => 1560, 'max_seconds' => null,  'bonus_percentage' => '0.00',   'sort_order' => 5, 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    private function adminUser(): User
    {
        $user = User::factory()->create();
        $user->assignRole('admin');

        return $user;
    }

    // ── GET /api/v1/punctuality/ranges ──────────────────────────────────────────

    #[Test]
    public function admin_can_list_ranges(): void
    {
        Passport::actingAs($this->adminUser());

        $response = $this->getJson('/api/v1/punctuality/ranges');

        $response->assertOk()
            ->assertJsonCount(5, 'data')
            ->assertJsonPath('data.0.sort_order', 1)
            ->assertJsonPath('data.0.bonus_percentage', 100)
            ->assertJsonPath('data.4.max_seconds', null);
    }

    #[Test]
    public function unauthenticated_cannot_list_ranges(): void
    {
        $this->getJson('/api/v1/punctuality/ranges')->assertUnauthorized();
    }

    #[Test]
    public function user_without_permission_cannot_list_ranges(): void
    {
        Passport::actingAs(User::factory()->create());
        $this->getJson('/api/v1/punctuality/ranges')->assertForbidden();
    }

    // ── PUT /api/v1/punctuality/ranges — happy path ─────────────────────────────

    #[Test]
    public function admin_can_replace_all_ranges(): void
    {
        Passport::actingAs($this->adminUser());

        $response = $this->putJson('/api/v1/punctuality/ranges', [
            'ranges' => [
                ['min_seconds' => 0,   'bonus_percentage' => 100],
                ['min_seconds' => 900, 'bonus_percentage' => 50],
                ['min_seconds' => 1800, 'bonus_percentage' => 0],
            ],
        ]);

        $response->assertOk()->assertJsonCount(3, 'data');

        $this->assertDatabaseCount('punctuality_ranges', 3);
        $this->assertDatabaseHas('punctuality_ranges', ['min_seconds' => 0,    'max_seconds' => 899,  'sort_order' => 1]);
        $this->assertDatabaseHas('punctuality_ranges', ['min_seconds' => 900,  'max_seconds' => 1799, 'sort_order' => 2]);
        $this->assertDatabaseHas('punctuality_ranges', ['min_seconds' => 1800, 'max_seconds' => null,  'sort_order' => 3]);
    }

    #[Test]
    public function server_computes_max_seconds_from_next_min(): void
    {
        Passport::actingAs($this->adminUser());

        $this->putJson('/api/v1/punctuality/ranges', [
            'ranges' => [
                ['min_seconds' => 0,   'bonus_percentage' => 100],
                ['min_seconds' => 600, 'bonus_percentage' => 0],
            ],
        ])->assertOk();

        $this->assertDatabaseHas('punctuality_ranges', ['min_seconds' => 0,   'max_seconds' => 599]);
        $this->assertDatabaseHas('punctuality_ranges', ['min_seconds' => 600, 'max_seconds' => null]);
    }

    #[Test]
    public function admin_can_simplify_to_a_single_range(): void
    {
        Passport::actingAs($this->adminUser());

        $this->putJson('/api/v1/punctuality/ranges', [
            'ranges' => [['min_seconds' => 0, 'bonus_percentage' => 100]],
        ])->assertOk()->assertJsonCount(1, 'data');

        $this->assertDatabaseCount('punctuality_ranges', 1);
        $this->assertDatabaseHas('punctuality_ranges', ['min_seconds' => 0, 'max_seconds' => null, 'bonus_percentage' => 100]);
    }

    #[Test]
    public function request_is_sorted_server_side_regardless_of_input_order(): void
    {
        Passport::actingAs($this->adminUser());

        $response = $this->putJson('/api/v1/punctuality/ranges', [
            'ranges' => [
                ['min_seconds' => 1800, 'bonus_percentage' => 0],
                ['min_seconds' => 0,    'bonus_percentage' => 100],
                ['min_seconds' => 900,  'bonus_percentage' => 50],
            ],
        ])->assertOk();

        $data = $response->json('data');
        $this->assertSame([0, 900, 1800], array_column($data, 'min_seconds'));
        $this->assertSame([1, 2, 3], array_column($data, 'sort_order'));
    }

    #[Test]
    public function response_returns_all_ranges_ordered_by_sort_order(): void
    {
        Passport::actingAs($this->adminUser());

        $response = $this->putJson('/api/v1/punctuality/ranges', [
            'ranges' => [
                ['min_seconds' => 0,   'bonus_percentage' => 100],
                ['min_seconds' => 600, 'bonus_percentage' => 50],
                ['min_seconds' => 900, 'bonus_percentage' => 0],
            ],
        ])->assertOk();

        $data = $response->json('data');
        $this->assertSame([1, 2, 3], array_column($data, 'sort_order'));
    }

    // ── PUT — validation ────────────────────────────────────────────────────────

    #[Test]
    public function update_rejects_missing_ranges_array(): void
    {
        Passport::actingAs($this->adminUser());
        $this->putJson('/api/v1/punctuality/ranges', [])->assertUnprocessable();
    }

    #[Test]
    public function update_rejects_empty_ranges_array(): void
    {
        Passport::actingAs($this->adminUser());
        $this->putJson('/api/v1/punctuality/ranges', ['ranges' => []])->assertUnprocessable();
    }

    #[Test]
    public function update_rejects_when_first_range_does_not_start_at_zero(): void
    {
        Passport::actingAs($this->adminUser());

        $this->putJson('/api/v1/punctuality/ranges', [
            'ranges' => [['min_seconds' => 600, 'bonus_percentage' => 50]],
        ])->assertUnprocessable();
    }

    #[Test]
    public function update_rejects_duplicate_min_seconds(): void
    {
        Passport::actingAs($this->adminUser());

        $this->putJson('/api/v1/punctuality/ranges', [
            'ranges' => [
                ['min_seconds' => 0,   'bonus_percentage' => 100],
                ['min_seconds' => 600, 'bonus_percentage' => 50],
                ['min_seconds' => 600, 'bonus_percentage' => 25],
            ],
        ])->assertUnprocessable();
    }

    #[Test]
    public function update_rejects_bonus_above_100(): void
    {
        Passport::actingAs($this->adminUser());

        $this->putJson('/api/v1/punctuality/ranges', [
            'ranges' => [['min_seconds' => 0, 'bonus_percentage' => 101]],
        ])->assertUnprocessable();
    }

    #[Test]
    public function update_rejects_negative_bonus(): void
    {
        Passport::actingAs($this->adminUser());

        $this->putJson('/api/v1/punctuality/ranges', [
            'ranges' => [['min_seconds' => 0, 'bonus_percentage' => -1]],
        ])->assertUnprocessable();
    }

    #[Test]
    public function unauthenticated_cannot_update_ranges(): void
    {
        $this->putJson('/api/v1/punctuality/ranges', [
            'ranges' => [['min_seconds' => 0, 'bonus_percentage' => 100]],
        ])->assertUnauthorized();
    }

    #[Test]
    public function user_without_permission_cannot_update_ranges(): void
    {
        Passport::actingAs(User::factory()->create());

        $this->putJson('/api/v1/punctuality/ranges', [
            'ranges' => [['min_seconds' => 0, 'bonus_percentage' => 100]],
        ])->assertForbidden();
    }
}
