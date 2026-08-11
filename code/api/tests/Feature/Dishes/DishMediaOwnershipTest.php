<?php

namespace Tests\Feature\Dishes;

use App\Models\Dish;
use App\Models\MediaAsset;
use App\Models\MediaGallery;
use App\Models\User;
use App\Services\Media\MediaAttachmentService;
use Illuminate\Support\Facades\Storage;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Dish::userCanManageMedia() gates media.update/media.delete on
 * dishes.manage-media — a permission distinct from dishes.update (which also
 * guards catalog/pricing edits via PUT /dishes/{id}) precisely so that
 * granting someone the ability to manage a dish's photo doesn't also hand
 * them menu write access. Mirrors ItemMediaOwnershipTest exactly — see
 * doc/conventions/backend/media-uploads.md.
 */
class DishMediaOwnershipTest extends DishesTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        Storage::fake('local');

        foreach (['media.upload', 'media.update', 'media.delete'] as $name) {
            Permission::firstOrCreate(['name' => $name, 'guard_name' => 'api']);
        }

        // $this->user (DishesTestCase) already has dishes.manage-media via the admin
        // role — add media.* so it's authorized end to end.
        $this->user->givePermissionTo(['media.upload', 'media.update', 'media.delete']);
    }

    private function attachedAsset(Dish $dish): MediaAsset
    {
        $gallery = MediaGallery::create(['name' => 'Dish gallery']);
        $asset = MediaAsset::create([
            'media_gallery_id' => $gallery->id,
            'path' => 'media/'.uniqid().'.jpg',
            'mime_type' => 'image/jpeg',
            'filename' => 'photo.jpg',
            'size' => 1024,
            'position' => 0,
            'is_primary' => true,
        ]);

        app(MediaAttachmentService::class)($dish, $gallery->id);

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
    public function it_allows_a_user_with_dishes_manage_media_to_modify_a_dishes_media(): void
    {
        $dish = $this->createDish();
        $asset = $this->attachedAsset($dish);

        $this->patchJson("/api/v1/media/assets/{$asset->public_id}", ['position' => 3])
            ->assertOk();
    }

    #[Test]
    public function it_allows_a_user_with_dishes_manage_media_to_delete_a_dishes_media(): void
    {
        $dish = $this->createDish();
        $asset = $this->attachedAsset($dish);

        $this->deleteJson("/api/v1/media/assets/{$asset->public_id}")
            ->assertOk();
    }

    #[Test]
    public function it_forbids_a_user_with_dishes_update_but_not_dishes_manage_media_from_modifying_a_dishes_media(): void
    {
        $dish = $this->createDish();
        $asset = $this->attachedAsset($dish);

        // dishes.update alone (catalog/pricing edit rights) is not
        // dishes.manage-media — granting the former must not silently grant
        // media control too.
        $outsider = $this->mediaOnlyUser(['dishes.update', 'media.update']);
        Passport::actingAs($outsider);

        $this->patchJson("/api/v1/media/assets/{$asset->public_id}", ['position' => 3])
            ->assertForbidden();
    }

    #[Test]
    public function it_forbids_a_user_with_only_media_update_from_modifying_a_dishes_media(): void
    {
        $dish = $this->createDish();
        $asset = $this->attachedAsset($dish);

        Passport::actingAs($this->mediaOnlyUser(['media.update']));

        $this->patchJson("/api/v1/media/assets/{$asset->public_id}", ['position' => 3])
            ->assertForbidden();
    }

    #[Test]
    public function it_forbids_a_user_with_only_media_delete_from_deleting_a_dishes_media(): void
    {
        $dish = $this->createDish();
        $asset = $this->attachedAsset($dish);

        Passport::actingAs($this->mediaOnlyUser(['media.delete']));

        $this->deleteJson("/api/v1/media/assets/{$asset->public_id}")
            ->assertForbidden();
    }

    #[Test]
    public function it_still_forbids_a_user_with_only_base_media_permission_when_the_dish_is_soft_deleted(): void
    {
        $dish = $this->createDish();
        $asset = $this->attachedAsset($dish);

        // Dish uses SoftDeletes — its own delete endpoint only ever soft-deletes.
        // The MorphTo attachable relation's default scope would then exclude it,
        // resolving to null: without withTrashed() this was misread as "entity
        // hasn't adopted AuthorizesMediaOwnership" and fell back to the base
        // media.* permission, silently granting access to anyone holding it.
        $dish->delete();

        Passport::actingAs($this->mediaOnlyUser(['media.update']));

        $this->patchJson("/api/v1/media/assets/{$asset->public_id}", ['position' => 3])
            ->assertForbidden();
    }

    #[Test]
    public function it_allows_a_user_with_dishes_manage_media_to_modify_media_of_a_soft_deleted_dish(): void
    {
        $dish = $this->createDish();
        $asset = $this->attachedAsset($dish);

        $dish->delete();

        // $this->user already has dishes.manage-media + media.* (setUp) —
        // withTrashed() must still resolve the soft-deleted Dish so its own
        // rule (not the "no rule" fallback) is what runs here.
        $this->patchJson("/api/v1/media/assets/{$asset->public_id}", ['position' => 3])
            ->assertOk();
    }
}
