<?php

namespace Tests\Feature\Auth;

use App\Models\MediaAttachment;
use App\Models\MediaGallery;
use App\Models\User;
use App\Services\Media\MediaAttachmentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * #420 — PATCH /auth/me/avatar lets an authenticated user attach/replace
 * their own avatar without holding users.update. Mirrors EmployeeAvatarTest's
 * upload-first/attach-on-save pattern, but this endpoint is strictly
 * self-service: the acting user and the avatar's target must always be the
 * same User, so it requires true ownership (isOwnAvatarOf()) on top of the
 * generic gallery-hijack guard, deliberately excluding the users.update
 * admin override that isManageableBy() alone would otherwise honor (see
 * UpdateMyAvatarRequest).
 */
class UpdateMyAvatarTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('local');
    }

    /**
     * @return array{gallery_id: string, owner_token: string}
     */
    private function uploadGallery(): array
    {
        $ownerToken = uniqid('token-', true);

        $galleryId = $this->postJson('/api/v1/media/upload', [
            'file' => UploadedFile::fake()->image('avatar.jpg'),
            'owner_token' => $ownerToken,
            'context' => 'avatar',
        ])->json('data.gallery_id');

        return ['gallery_id' => $galleryId, 'owner_token' => $ownerToken];
    }

    private function galleryNumericId(string $publicId): int
    {
        return MediaGallery::where('public_id', $publicId)->value('id');
    }

    #[Test]
    public function an_authenticated_user_can_attach_their_own_avatar(): void
    {
        $user = User::factory()->create();
        Passport::actingAs($user);

        $gallery = $this->uploadGallery();

        $response = $this->patchJson('/api/v1/auth/me/avatar', [
            'media_gallery_id' => $gallery['gallery_id'],
            'owner_token' => $gallery['owner_token'],
        ]);

        $response->assertOk();
        $this->assertNotNull($response->json('data.avatar_url'));
        $this->assertDatabaseHas('media_attachments', [
            'media_gallery_id' => $this->galleryNumericId($gallery['gallery_id']),
            'attachable_type' => User::class,
            'attachable_id' => $user->id,
            'is_primary' => true,
        ]);
    }

    #[Test]
    public function a_user_can_replace_their_own_existing_avatar(): void
    {
        $user = User::factory()->create();
        Passport::actingAs($user);

        $firstGallery = $this->uploadGallery();
        $this->patchJson('/api/v1/auth/me/avatar', [
            'media_gallery_id' => $firstGallery['gallery_id'],
            'owner_token' => $firstGallery['owner_token'],
        ])->assertOk();

        $secondGallery = $this->uploadGallery();
        $this->patchJson('/api/v1/auth/me/avatar', [
            'media_gallery_id' => $secondGallery['gallery_id'],
            'owner_token' => $secondGallery['owner_token'],
        ])->assertOk();

        $this->assertDatabaseMissing('media_attachments', [
            'media_gallery_id' => $this->galleryNumericId($firstGallery['gallery_id']),
            'attachable_id' => $user->id,
        ]);
        $this->assertDatabaseHas('media_attachments', [
            'media_gallery_id' => $this->galleryNumericId($secondGallery['gallery_id']),
            'attachable_id' => $user->id,
            'is_primary' => true,
        ]);
    }

    #[Test]
    public function a_user_without_users_update_can_replace_an_avatar_already_attached_to_themselves(): void
    {
        $user = User::factory()->create();
        Passport::actingAs($user);

        $firstGallery = $this->uploadGallery();
        app(MediaAttachmentService::class)($user, $this->galleryNumericId($firstGallery['gallery_id']));

        $secondGallery = $this->uploadGallery();

        $this->patchJson('/api/v1/auth/me/avatar', [
            'media_gallery_id' => $secondGallery['gallery_id'],
            'owner_token' => $secondGallery['owner_token'],
        ])->assertOk();
    }

    #[Test]
    public function a_user_cannot_claim_another_users_unattached_gallery(): void
    {
        $owner = User::factory()->create();
        Passport::actingAs($owner);

        $gallery = $this->uploadGallery();

        $attacker = User::factory()->create();
        Passport::actingAs($attacker);

        $this->patchJson('/api/v1/auth/me/avatar', [
            'media_gallery_id' => $gallery['gallery_id'],
            // owner_token omitted — simulates a caller who merely learned the public_id.
        ])->assertForbidden();

        $this->assertSame(0, MediaAttachment::count());
    }

    #[Test]
    public function a_user_cannot_claim_an_orphaned_avatar_gallery_with_no_owner_token(): void
    {
        // A legacy row from before the owner_token column existed, or a previous
        // avatar detached by MediaAttachmentService on replace — now unattached and
        // token-less. isManageableBy()'s "no token -> anyone" fallback only stayed
        // safe while a base media.* permission still gated every caller; since this
        // endpoint has none, nobody may claim it as their own avatar.
        $gallery = MediaGallery::create(['name' => 'Orphaned avatar gallery', 'context' => 'avatar']);

        Passport::actingAs(User::factory()->create());

        $this->patchJson('/api/v1/auth/me/avatar', [
            'media_gallery_id' => $gallery->public_id,
        ])->assertForbidden();

        $this->assertSame(0, MediaAttachment::count());
    }

    #[Test]
    public function a_user_cannot_replace_another_users_already_attached_avatar(): void
    {
        $victim = User::factory()->create();
        Passport::actingAs($victim);
        $victimGallery = $this->uploadGallery();
        $this->patchJson('/api/v1/auth/me/avatar', [
            'media_gallery_id' => $victimGallery['gallery_id'],
            'owner_token' => $victimGallery['owner_token'],
        ])->assertOk();

        $attacker = User::factory()->create();
        Passport::actingAs($attacker);

        // The attacker re-submits the victim's now-attached gallery id as their
        // own — isManageableBy() must reject it via the victim's
        // userCanManageMedia(), not just the owner_token unattached-only check.
        $this->patchJson('/api/v1/auth/me/avatar', [
            'media_gallery_id' => $victimGallery['gallery_id'],
            'owner_token' => $victimGallery['owner_token'],
        ])->assertForbidden();

        $this->assertDatabaseHas('media_attachments', [
            'media_gallery_id' => $this->galleryNumericId($victimGallery['gallery_id']),
            'attachable_type' => User::class,
            'attachable_id' => $victim->id,
        ]);
    }

    #[Test]
    public function a_user_with_users_update_cannot_claim_another_users_already_attached_avatar(): void
    {
        // isManageableBy() would allow this via User::userCanManageMedia()'s
        // users.update admin override (meant to let an admin manage an
        // *employee's* avatar through the employee form, #401) — this
        // strictly self-service endpoint must require true ownership
        // (isOwnAvatarOf()), not just "may manage", or a caller holding
        // users.update could silently claim another employee's already-
        // attached avatar gallery as their own via this endpoint instead of
        // the employee form.
        Permission::firstOrCreate(['name' => 'users.update', 'guard_name' => 'api']);
        $role = Role::firstOrCreate(['name' => 'users-update-only', 'guard_name' => 'api']);
        $role->givePermissionTo('users.update');
        $attacker = User::factory()->create();
        $attacker->assignRole('users-update-only');

        $victim = User::factory()->create();
        Passport::actingAs($victim);
        $victimGallery = $this->uploadGallery();
        $this->patchJson('/api/v1/auth/me/avatar', [
            'media_gallery_id' => $victimGallery['gallery_id'],
            'owner_token' => $victimGallery['owner_token'],
        ])->assertOk();

        Passport::actingAs($attacker);

        $this->patchJson('/api/v1/auth/me/avatar', [
            'media_gallery_id' => $victimGallery['gallery_id'],
            'owner_token' => $victimGallery['owner_token'],
        ])->assertForbidden();

        $this->assertDatabaseHas('media_attachments', [
            'media_gallery_id' => $this->galleryNumericId($victimGallery['gallery_id']),
            'attachable_type' => User::class,
            'attachable_id' => $victim->id,
        ]);
        $this->assertDatabaseMissing('media_attachments', [
            'media_gallery_id' => $this->galleryNumericId($victimGallery['gallery_id']),
            'attachable_id' => $attacker->id,
        ]);
    }

    #[Test]
    public function it_requires_media_gallery_id(): void
    {
        Passport::actingAs(User::factory()->create());

        $this->patchJson('/api/v1/auth/me/avatar', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors('media_gallery_id');
    }

    #[Test]
    public function it_rejects_a_soft_deleted_gallery(): void
    {
        Passport::actingAs(User::factory()->create());

        $gallery = $this->uploadGallery();
        MediaGallery::where('public_id', $gallery['gallery_id'])->first()->delete();

        $this->patchJson('/api/v1/auth/me/avatar', [
            'media_gallery_id' => $gallery['gallery_id'],
            'owner_token' => $gallery['owner_token'],
        ])->assertStatus(422)->assertJsonValidationErrors('media_gallery_id');
    }

    #[Test]
    public function it_rejects_attaching_a_non_avatar_context_gallery(): void
    {
        // item/dish contexts allow MP4/MOV; avatarUrl() would return a video URL that
        // every avatar surface renders through a plain <img>, so only an avatar-context
        // gallery may ever be attached here — regardless of who owns it.
        Permission::firstOrCreate(['name' => 'media.upload', 'guard_name' => 'api']);
        $role = Role::firstOrCreate(['name' => 'media-uploader', 'guard_name' => 'api']);
        $role->givePermissionTo('media.upload');
        $user = User::factory()->create();
        $user->assignRole('media-uploader');
        Passport::actingAs($user);

        $ownerToken = uniqid('token-', true);
        $galleryId = $this->postJson('/api/v1/media/upload', [
            'file' => UploadedFile::fake()->image('item.jpg'),
            'owner_token' => $ownerToken,
            'context' => 'item',
        ])->json('data.gallery_id');

        $response = $this->patchJson('/api/v1/auth/me/avatar', [
            'media_gallery_id' => $galleryId,
            'owner_token' => $ownerToken,
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors('media_gallery_id');
        $this->assertSame(0, MediaAttachment::count());
    }

    #[Test]
    public function it_requires_authentication(): void
    {
        $this->patchJson('/api/v1/auth/me/avatar', [
            'media_gallery_id' => 'irrelevant',
        ])->assertUnauthorized();
    }
}
