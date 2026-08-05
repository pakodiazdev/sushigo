<?php

namespace Tests\Feature\Media;

use App\Models\MediaAsset;
use App\Models\MediaGallery;
use App\Models\User;
use App\Services\Media\UpdateMediaAssetService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class MediaAssetUpdateTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        Storage::fake('local');

        Permission::create(['name' => 'media.update', 'guard_name' => 'api']);
        $admin = Role::create(['name' => 'admin', 'guard_name' => 'api']);
        $admin->givePermissionTo('media.update');
    }

    private function actingAsAdmin(): void
    {
        $user = User::factory()->create();
        $user->assignRole('admin');

        Passport::actingAs($user);
    }

    private function createAsset(array $attributes = []): MediaAsset
    {
        $gallery = MediaGallery::create(['name' => 'Test gallery']);

        return MediaAsset::create(array_merge([
            'media_gallery_id' => $gallery->id,
            'path' => 'media/'.uniqid().'.jpg',
            'mime_type' => 'image/jpeg',
            'filename' => 'photo.jpg',
            'size' => 1024,
            'position' => 0,
            'is_primary' => false,
        ], $attributes));
    }

    #[Test]
    public function it_updates_position(): void
    {
        $this->actingAsAdmin();
        $asset = $this->createAsset();

        $this->patchJson("/api/v1/media/assets/{$asset->public_id}", ['position' => 3])
            ->assertOk()
            ->assertJsonPath('data.position', 3);

        $this->assertSame(3, $asset->refresh()->position);
    }

    #[Test]
    public function it_rejects_an_array_owner_token_with_a_clean_422(): void
    {
        $this->actingAsAdmin();
        $asset = $this->createAsset();

        // authorize() reads owner_token raw (runs before validation) and
        // passes it into MediaGallery::isManageableBy(?string $providedToken)
        // — an array here must not reach that typed parameter unguarded
        // (would raise a TypeError / 500 regardless of whether the gallery
        // has a stored token, since the crash happens at the call boundary).
        $this->patchJson("/api/v1/media/assets/{$asset->public_id}", [
            'position' => 3,
            'owner_token' => ['not-a-string'],
        ])->assertUnprocessable()->assertJsonValidationErrors('owner_token');
    }

    #[Test]
    public function it_sets_is_primary_and_unsets_siblings(): void
    {
        $this->actingAsAdmin();

        $gallery = MediaGallery::create(['name' => 'Shared gallery']);
        $first = $this->createAsset(['media_gallery_id' => $gallery->id, 'is_primary' => true]);
        $second = $this->createAsset(['media_gallery_id' => $gallery->id, 'is_primary' => false]);

        $this->patchJson("/api/v1/media/assets/{$second->public_id}", ['is_primary' => true])
            ->assertOk()
            ->assertJsonPath('data.is_primary', true);

        $this->assertFalse($first->refresh()->is_primary);
        $this->assertTrue($second->refresh()->is_primary);
    }

    #[Test]
    public function it_sets_is_primary_and_unsets_siblings_when_sent_as_integer_one(): void
    {
        $this->actingAsAdmin();

        $gallery = MediaGallery::create(['name' => 'Shared gallery']);
        $first = $this->createAsset(['media_gallery_id' => $gallery->id, 'is_primary' => true]);
        $second = $this->createAsset(['media_gallery_id' => $gallery->id, 'is_primary' => false]);

        // JSON integer 1 (not boolean true) — the `boolean` validation rule
        // accepts it, but assetData() must normalize it to a real bool before
        // it reaches UpdateMediaAssetService's strict `=== true` check, or
        // the sibling never gets demoted and the gallery ends up with two
        // primaries.
        $this->patchJson("/api/v1/media/assets/{$second->public_id}", ['is_primary' => 1])
            ->assertOk()
            ->assertJsonPath('data.is_primary', true);

        $this->assertFalse($first->refresh()->is_primary);
        $this->assertTrue($second->refresh()->is_primary);
    }

    #[Test]
    public function it_promotes_the_next_asset_when_the_primary_is_explicitly_unset(): void
    {
        $this->actingAsAdmin();

        $gallery = MediaGallery::create(['name' => 'Shared gallery']);
        $primary = $this->createAsset(['media_gallery_id' => $gallery->id, 'position' => 0, 'is_primary' => true]);
        $second = $this->createAsset(['media_gallery_id' => $gallery->id, 'position' => 1, 'is_primary' => false]);

        $this->patchJson("/api/v1/media/assets/{$primary->public_id}", ['is_primary' => false])
            ->assertOk()
            ->assertJsonPath('data.is_primary', false);

        $this->assertFalse($primary->refresh()->is_primary);
        $this->assertTrue($second->refresh()->is_primary);
    }

    #[Test]
    public function it_refuses_to_unmark_primary_when_it_is_the_only_asset_in_the_gallery(): void
    {
        $this->actingAsAdmin();

        $gallery = MediaGallery::create(['name' => 'Solo gallery']);
        $onlyAsset = $this->createAsset(['media_gallery_id' => $gallery->id, 'is_primary' => true]);

        // No sibling exists to promote, so demoting the only asset would
        // leave the gallery with zero primaries — the request is silently
        // refused instead, keeping the "never zero primaries while assets
        // exist" invariant.
        $this->patchJson("/api/v1/media/assets/{$onlyAsset->public_id}", ['is_primary' => false])
            ->assertOk()
            ->assertJsonPath('data.is_primary', true);

        $this->assertTrue($onlyAsset->refresh()->is_primary);
    }

    #[Test]
    public function it_does_not_create_two_primaries_when_a_stale_asset_instance_races_a_promotion(): void
    {
        $gallery = MediaGallery::create(['name' => 'Shared gallery']);
        $a = $this->createAsset(['media_gallery_id' => $gallery->id, 'position' => 0, 'is_primary' => true]);
        $b = $this->createAsset(['media_gallery_id' => $gallery->id, 'position' => 1, 'is_primary' => false]);
        $c = $this->createAsset(['media_gallery_id' => $gallery->id, 'position' => 2, 'is_primary' => false]);

        // Simulates a second, slower request that loaded A via route-model
        // binding before the first request ran — its in-memory is_primary is
        // still true even after the first request demotes A in favor of C.
        $staleA = MediaAsset::find($a->id);

        // Request 1: explicitly mark C as primary. Unconditionally demotes
        // every sibling, including A — this branch doesn't depend on stale
        // reads, so it's correct regardless of ordering.
        app(UpdateMediaAssetService::class)($c, ['is_primary' => true]);
        $this->assertTrue($c->refresh()->is_primary);
        $this->assertFalse($a->refresh()->is_primary);

        // Request 2: explicitly demote A using the stale pre-demotion
        // instance. Without re-reading is_primary after the lock,
        // $wasPrimary would be the stale `true` captured before request 1
        // ran, promoting B (next sibling by position) on top of C — leaving
        // two primaries.
        app(UpdateMediaAssetService::class)($staleA, ['is_primary' => false]);

        $this->assertFalse($b->refresh()->is_primary);
        $this->assertTrue($c->refresh()->is_primary);
    }

    #[Test]
    public function it_returns_404_for_missing_asset(): void
    {
        $this->actingAsAdmin();

        $this->patchJson('/api/v1/media/assets/999999', ['position' => 1])
            ->assertNotFound();
    }

    #[Test]
    public function it_requires_at_least_one_field(): void
    {
        $this->actingAsAdmin();
        $asset = $this->createAsset();

        $this->patchJson("/api/v1/media/assets/{$asset->public_id}", [])
            ->assertUnprocessable();
    }

    #[Test]
    public function unauthenticated_cannot_update(): void
    {
        $asset = $this->createAsset();

        $this->patchJson("/api/v1/media/assets/{$asset->public_id}", ['position' => 1])
            ->assertUnauthorized();
    }

    #[Test]
    public function user_without_permission_cannot_update(): void
    {
        Passport::actingAs(User::factory()->create());
        $asset = $this->createAsset();

        $this->patchJson("/api/v1/media/assets/{$asset->public_id}", ['position' => 1])
            ->assertForbidden();
    }
}
