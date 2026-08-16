<?php

namespace Tests\Feature\Media;

use App\Models\MediaAsset;
use App\Models\MediaGallery;
use App\Models\User;
use App\Services\Media\DeleteMediaAssetService;
use App\Services\Media\MediaAttachmentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class MediaAssetDeleteTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        Storage::fake('local');

        Permission::create(['name' => 'media.delete', 'guard_name' => 'api']);
        Permission::create(['name' => 'media.upload', 'guard_name' => 'api']);
        $admin = Role::create(['name' => 'admin', 'guard_name' => 'api']);
        $admin->givePermissionTo(['media.delete', 'media.upload']);
    }

    private function actingAsAdmin(): void
    {
        $user = User::factory()->create();
        $user->assignRole('admin');

        Passport::actingAs($user);
    }

    #[Test]
    public function it_deletes_the_asset_record_and_its_stored_file(): void
    {
        $this->actingAsAdmin();

        $uploaded = $this->postJson('/api/v1/media/upload', [
            'file' => UploadedFile::fake()->image('photo.jpg'),
            'owner_token' => 'token-1',
            'context' => 'item',
        ])->json('data');

        $asset = MediaAsset::where('public_id', $uploaded['asset_id'])->firstOrFail();
        Storage::disk('local')->assertExists($asset->path);

        // owner_token goes in the JSON body, not the query string — a query
        // param would leak this bearer-style credential into access logs.
        $this->deleteJson("/api/v1/media/assets/{$asset->public_id}", ['owner_token' => 'token-1'])
            ->assertOk();

        Storage::disk('local')->assertMissing($asset->path);
        $this->assertDatabaseMissing('media_assets', ['id' => $asset->id]);
    }

    #[Test]
    public function it_rejects_an_array_owner_token_with_a_clean_422(): void
    {
        $this->actingAsAdmin();

        $gallery = MediaGallery::create(['name' => 'Test gallery']);
        $asset = MediaAsset::create([
            'media_gallery_id' => $gallery->id,
            'path' => 'media/photo.jpg',
            'mime_type' => 'image/jpeg',
            'filename' => 'photo.jpg',
            'size' => 1024,
            'position' => 0,
            'is_primary' => true,
        ]);

        // authorize() reads owner_token raw (runs before validation) and
        // passes it into MediaGallery::isManageableBy(?string $providedToken)
        // — an array here (sent in the JSON body, same as owner_token always
        // is for DELETE — never a query param, which would leak it into
        // access logs) must not reach that typed parameter unguarded (would
        // raise a TypeError / 500).
        $this->deleteJson("/api/v1/media/assets/{$asset->public_id}", ['owner_token' => ['not-a-string']])
            ->assertUnprocessable()->assertJsonValidationErrors('owner_token');
    }

    #[Test]
    public function it_promotes_the_next_asset_to_primary_when_the_primary_is_deleted(): void
    {
        $this->actingAsAdmin();

        $gallery = MediaGallery::create(['name' => 'Shared gallery']);
        $primary = MediaAsset::create([
            'media_gallery_id' => $gallery->id,
            'path' => 'media/'.uniqid().'.jpg',
            'mime_type' => 'image/jpeg',
            'filename' => 'first.jpg',
            'size' => 1024,
            'position' => 0,
            'is_primary' => true,
        ]);
        $second = MediaAsset::create([
            'media_gallery_id' => $gallery->id,
            'path' => 'media/'.uniqid().'.jpg',
            'mime_type' => 'image/jpeg',
            'filename' => 'second.jpg',
            'size' => 1024,
            'position' => 1,
            'is_primary' => false,
        ]);

        $this->deleteJson("/api/v1/media/assets/{$primary->public_id}")->assertOk();

        $this->assertTrue($second->refresh()->is_primary);
    }

    #[Test]
    public function it_does_not_lose_the_primary_when_a_stale_asset_instance_races_a_promotion(): void
    {
        $gallery = MediaGallery::create(['name' => 'Shared gallery']);
        $a = MediaAsset::create([
            'media_gallery_id' => $gallery->id,
            'path' => 'media/'.uniqid().'.jpg',
            'mime_type' => 'image/jpeg',
            'filename' => 'a.jpg',
            'size' => 1024,
            'position' => 0,
            'is_primary' => true,
        ]);
        $b = MediaAsset::create([
            'media_gallery_id' => $gallery->id,
            'path' => 'media/'.uniqid().'.jpg',
            'mime_type' => 'image/jpeg',
            'filename' => 'b.jpg',
            'size' => 1024,
            'position' => 1,
            'is_primary' => false,
        ]);
        $c = MediaAsset::create([
            'media_gallery_id' => $gallery->id,
            'path' => 'media/'.uniqid().'.jpg',
            'mime_type' => 'image/jpeg',
            'filename' => 'c.jpg',
            'size' => 1024,
            'position' => 2,
            'is_primary' => false,
        ]);

        // Simulates a second, slower request that loaded B via route-model
        // binding before the first request ran — its in-memory is_primary
        // is still false even after the first request promotes B.
        $staleB = MediaAsset::find($b->id);

        // Request 1: delete the primary (A). Promotes B (next by position).
        app(DeleteMediaAssetService::class)($a);
        $this->assertTrue($b->refresh()->is_primary);

        // Request 2: delete B using the stale pre-promotion instance.
        // Without re-reading is_primary after the lock, $wasPrimary would be
        // the stale `false` captured before request 1 ran, skipping
        // promotion and leaving the gallery with zero primaries.
        app(DeleteMediaAssetService::class)($staleB);

        $this->assertTrue($c->refresh()->is_primary);
    }

    #[Test]
    public function it_tolerates_deleting_an_asset_a_concurrent_actor_already_removed(): void
    {
        $gallery = MediaGallery::create(['name' => 'Test gallery']);
        $asset = MediaAsset::create([
            'media_gallery_id' => $gallery->id,
            'path' => 'media/'.uniqid().'.jpg',
            'mime_type' => 'image/jpeg',
            'filename' => 'photo.jpg',
            'size' => 1024,
            'position' => 0,
            'is_primary' => true,
        ]);

        // Simulates two concurrent actors that both loaded this same asset
        // before either deleted it — e.g. two media:cleanup-orphans
        // instances sweeping the same backlog (TD-02 relies on that being
        // safe), or a DELETE request racing the cleanup sweep.
        $staleAsset = MediaAsset::find($asset->id);

        app(DeleteMediaAssetService::class)($asset);
        $this->assertDatabaseMissing('media_assets', ['id' => $asset->id]);

        // The second caller's copy now points at an already-deleted row —
        // must not throw (would otherwise crash the whole cleanup sweep
        // over one already-handled asset).
        app(DeleteMediaAssetService::class)($staleAsset);
    }

    #[Test]
    public function it_returns_404_for_missing_asset(): void
    {
        $this->actingAsAdmin();

        $this->deleteJson('/api/v1/media/assets/999999')->assertNotFound();
    }

    #[Test]
    public function unauthenticated_cannot_delete(): void
    {
        $gallery = MediaGallery::create(['name' => 'Test gallery']);
        $asset = MediaAsset::create([
            'media_gallery_id' => $gallery->id,
            'path' => 'media/photo.jpg',
            'mime_type' => 'image/jpeg',
            'filename' => 'photo.jpg',
            'size' => 1024,
            'position' => 0,
            'is_primary' => true,
        ]);

        $this->deleteJson("/api/v1/media/assets/{$asset->public_id}")->assertUnauthorized();
    }

    #[Test]
    public function user_without_permission_cannot_delete(): void
    {
        Passport::actingAs(User::factory()->create());

        $gallery = MediaGallery::create(['name' => 'Test gallery']);
        $asset = MediaAsset::create([
            'media_gallery_id' => $gallery->id,
            'path' => 'media/photo.jpg',
            'mime_type' => 'image/jpeg',
            'filename' => 'photo.jpg',
            'size' => 1024,
            'position' => 0,
            'is_primary' => true,
        ]);

        $this->deleteJson("/api/v1/media/assets/{$asset->public_id}")->assertForbidden();
    }

    #[Test]
    public function a_user_without_media_delete_permission_can_delete_their_own_avatar_asset(): void
    {
        // #420 — the self-service avatar uploader's remove control calls this endpoint
        // directly, so avatar-context assets must bypass media.delete for their own
        // owner, same as the upload/reorder steps already do.
        $user = User::factory()->create();
        $gallery = MediaGallery::create(['name' => 'Avatar gallery', 'context' => 'avatar']);
        app(MediaAttachmentService::class)($user, $gallery->id);
        $asset = MediaAsset::create([
            'media_gallery_id' => $gallery->id,
            'path' => 'media/photo.jpg',
            'mime_type' => 'image/jpeg',
            'filename' => 'photo.jpg',
            'size' => 1024,
            'position' => 0,
            'is_primary' => true,
        ]);

        Passport::actingAs($user);

        $this->deleteJson("/api/v1/media/assets/{$asset->public_id}")->assertOk();
        $this->assertDatabaseMissing('media_assets', ['id' => $asset->id]);
    }

    #[Test]
    public function a_user_without_media_delete_permission_still_cannot_delete_a_non_avatar_asset_they_own(): void
    {
        $user = User::factory()->create();
        $gallery = MediaGallery::create(['name' => 'Item gallery', 'context' => 'item']);
        app(MediaAttachmentService::class)($user, $gallery->id);
        $asset = MediaAsset::create([
            'media_gallery_id' => $gallery->id,
            'path' => 'media/photo.jpg',
            'mime_type' => 'image/jpeg',
            'filename' => 'photo.jpg',
            'size' => 1024,
            'position' => 0,
            'is_primary' => true,
        ]);

        Passport::actingAs($user);

        $this->deleteJson("/api/v1/media/assets/{$asset->public_id}")->assertForbidden();
    }

    #[Test]
    public function a_stranger_cannot_delete_an_orphaned_avatar_gallery_with_no_owner_token(): void
    {
        // See the matching test in MediaAssetUpdateTest for the full rationale — a
        // token-less, unattached avatar gallery must be unmanageable by anyone now
        // that avatar context bypasses the media.delete permission entirely.
        $gallery = MediaGallery::create(['name' => 'Orphaned avatar gallery', 'context' => 'avatar']);
        $asset = MediaAsset::create([
            'media_gallery_id' => $gallery->id,
            'path' => 'media/photo.jpg',
            'mime_type' => 'image/jpeg',
            'filename' => 'photo.jpg',
            'size' => 1024,
            'position' => 0,
            'is_primary' => true,
        ]);

        Passport::actingAs(User::factory()->create());

        $this->deleteJson("/api/v1/media/assets/{$asset->public_id}")->assertForbidden();
        $this->assertDatabaseHas('media_assets', ['id' => $asset->id]);
    }
}
