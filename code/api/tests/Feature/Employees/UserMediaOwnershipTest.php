<?php

namespace Tests\Feature\Employees;

use App\Models\MediaAsset;
use App\Models\MediaGallery;
use App\Models\User;
use App\Services\Media\MediaAttachmentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

/**
 * User::userCanManageMedia() gates media.update/media.delete on the caller
 * being the avatar's own owner OR holding users.update — see #401 and
 * doc/conventions/backend/media-uploads.md §5. Mirrors
 * Inventory\ItemMediaOwnershipTest's structure for the owner-or-permission
 * variant instead of Item's dedicated-permission variant.
 */
class UserMediaOwnershipTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        Storage::fake('local');

        foreach (['media.upload', 'media.update', 'media.delete', 'users.update'] as $name) {
            Permission::firstOrCreate(['name' => $name, 'guard_name' => 'api']);
        }
    }

    private function attachedAvatar(User $owner): MediaAsset
    {
        $gallery = MediaGallery::create(['name' => 'Avatar gallery']);
        $asset = MediaAsset::create([
            'media_gallery_id' => $gallery->id,
            'path' => 'media/'.uniqid().'.jpg',
            'mime_type' => 'image/jpeg',
            'filename' => 'avatar.jpg',
            'size' => 1024,
            'position' => 0,
            'is_primary' => true,
        ]);

        app(MediaAttachmentService::class)($owner, $gallery->id);

        return $asset;
    }

    private function mediaOnlyUser(array $permissions): User
    {
        $outsider = User::factory()->create();
        $role = Role::firstOrCreate(['name' => 'media-only', 'guard_name' => 'api']);
        $role->syncPermissions($permissions);
        $outsider->assignRole('media-only');

        return $outsider;
    }

    #[Test]
    public function the_owner_can_modify_their_own_avatar_without_users_update(): void
    {
        $owner = $this->mediaOnlyUser(['media.update']);
        $asset = $this->attachedAvatar($owner);

        Passport::actingAs($owner);

        $this->patchJson("/api/v1/media/assets/{$asset->public_id}", ['position' => 3])
            ->assertOk();
    }

    #[Test]
    public function the_owner_can_delete_their_own_avatar_without_users_update(): void
    {
        $owner = $this->mediaOnlyUser(['media.delete']);
        $asset = $this->attachedAvatar($owner);

        Passport::actingAs($owner);

        $this->deleteJson("/api/v1/media/assets/{$asset->public_id}")
            ->assertOk();
    }

    #[Test]
    public function a_user_with_users_update_can_modify_another_users_avatar(): void
    {
        $owner = User::factory()->create();
        $asset = $this->attachedAvatar($owner);

        Passport::actingAs($this->mediaOnlyUser(['media.update', 'users.update']));

        $this->patchJson("/api/v1/media/assets/{$asset->public_id}", ['position' => 3])
            ->assertOk();
    }

    #[Test]
    public function a_user_without_users_update_cannot_modify_another_users_avatar(): void
    {
        $owner = User::factory()->create();
        $asset = $this->attachedAvatar($owner);

        Passport::actingAs($this->mediaOnlyUser(['media.update']));

        $this->patchJson("/api/v1/media/assets/{$asset->public_id}", ['position' => 3])
            ->assertForbidden();
    }

    #[Test]
    public function a_user_without_users_update_cannot_delete_another_users_avatar(): void
    {
        $owner = User::factory()->create();
        $asset = $this->attachedAvatar($owner);

        Passport::actingAs($this->mediaOnlyUser(['media.delete']));

        $this->deleteJson("/api/v1/media/assets/{$asset->public_id}")
            ->assertForbidden();
    }
}
