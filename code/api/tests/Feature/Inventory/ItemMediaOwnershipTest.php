<?php

namespace Tests\Feature\Inventory;

use App\Models\Item;
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
 * Item::userCanManageMedia() gates media.update/media.delete on
 * items.manage-media — a permission distinct from items.update (which also
 * guards catalog/pricing edits via PUT /items/{id} and
 * PUT /item-variants/{id}) precisely so that granting someone the ability to
 * manage an item's photos doesn't also hand them catalog write access. See
 * doc/conventions/backend/media-uploads.md.
 */
class ItemMediaOwnershipTest extends InventoryTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        Storage::fake('local');

        foreach (['media.upload', 'media.update', 'media.delete'] as $name) {
            Permission::firstOrCreate(['name' => $name, 'guard_name' => 'api']);
        }

        // $this->user (InventoryTestCase) already has items.manage-media via
        // the inventory-manager role — add media.* so it's authorized end to
        // end.
        $this->user->givePermissionTo(['media.upload', 'media.update', 'media.delete']);
    }

    private function attachedAsset(Item $item): MediaAsset
    {
        $gallery = MediaGallery::create(['name' => 'Item gallery']);
        $asset = MediaAsset::create([
            'media_gallery_id' => $gallery->id,
            'path' => 'media/'.uniqid().'.jpg',
            'mime_type' => 'image/jpeg',
            'filename' => 'photo.jpg',
            'size' => 1024,
            'position' => 0,
            'is_primary' => true,
        ]);

        app(MediaAttachmentService::class)($item, $gallery->id);

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
    public function it_allows_a_user_with_items_manage_media_to_modify_an_items_media(): void
    {
        $item = $this->createItem();
        $asset = $this->attachedAsset($item);

        $this->patchJson("/api/v1/media/assets/{$asset->public_id}", ['position' => 3])
            ->assertOk();
    }

    #[Test]
    public function it_allows_a_user_with_items_manage_media_to_delete_an_items_media(): void
    {
        $item = $this->createItem();
        $asset = $this->attachedAsset($item);

        $this->deleteJson("/api/v1/media/assets/{$asset->public_id}")
            ->assertOk();
    }

    #[Test]
    public function it_forbids_a_user_with_items_update_but_not_items_manage_media_from_modifying_an_items_media(): void
    {
        $item = $this->createItem();
        $asset = $this->attachedAsset($item);

        // items.update alone (catalog/pricing edit rights) is not
        // items.manage-media — granting the former must not silently grant
        // media control too.
        $outsider = $this->mediaOnlyUser(['items.update', 'media.update']);
        Passport::actingAs($outsider);

        $this->patchJson("/api/v1/media/assets/{$asset->public_id}", ['position' => 3])
            ->assertForbidden();
    }

    #[Test]
    public function it_forbids_a_user_with_only_media_update_from_modifying_an_items_media(): void
    {
        $item = $this->createItem();
        $asset = $this->attachedAsset($item);

        Passport::actingAs($this->mediaOnlyUser(['media.update']));

        $this->patchJson("/api/v1/media/assets/{$asset->public_id}", ['position' => 3])
            ->assertForbidden();
    }

    #[Test]
    public function it_forbids_a_user_with_only_media_delete_from_deleting_an_items_media(): void
    {
        $item = $this->createItem();
        $asset = $this->attachedAsset($item);

        Passport::actingAs($this->mediaOnlyUser(['media.delete']));

        $this->deleteJson("/api/v1/media/assets/{$asset->public_id}")
            ->assertForbidden();
    }

    #[Test]
    public function it_still_forbids_a_user_with_only_base_media_permission_when_the_item_is_soft_deleted(): void
    {
        $item = $this->createItem();
        $asset = $this->attachedAsset($item);

        // Item uses SoftDeletes — its own delete endpoint only ever soft-
        // deletes. The MorphTo attachable relation's default scope would
        // then exclude it, resolving to null: without withTrashed() this
        // was misread as "entity hasn't adopted AuthorizesMediaOwnership"
        // and fell back to the base media.* permission, silently granting
        // access to anyone holding it.
        $item->delete();

        Passport::actingAs($this->mediaOnlyUser(['media.update']));

        $this->patchJson("/api/v1/media/assets/{$asset->public_id}", ['position' => 3])
            ->assertForbidden();
    }

    #[Test]
    public function it_allows_a_user_with_items_manage_media_to_modify_media_of_a_soft_deleted_item(): void
    {
        $item = $this->createItem();
        $asset = $this->attachedAsset($item);

        $item->delete();

        // $this->user already has items.manage-media + media.* (setUp) —
        // withTrashed() must still resolve the soft-deleted Item so its own
        // rule (not the "no rule" fallback) is what runs here.
        $this->patchJson("/api/v1/media/assets/{$asset->public_id}", ['position' => 3])
            ->assertOk();
    }
}
