<?php

namespace Tests\Feature\Inventory;

use App\Models\Item;
use App\Models\MediaAttachment;
use App\Models\MediaGallery;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Permission;

class ItemMediaAttachmentTest extends InventoryTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('local');

        Permission::firstOrCreate(['name' => 'media.upload', 'guard_name' => 'api']);
        $this->user->givePermissionTo('media.upload');
    }

    /**
     * Returns the gallery's public_id (ULID) plus the owner_token that
     * created it — both are needed to attach it to an item, since the
     * item create/update requests now check isManageableBy() the same way
     * the media endpoints do.
     */
    private function uploadGallery(): array
    {
        $ownerToken = uniqid('token-', true);

        $galleryId = $this->postJson('/api/v1/media/upload', [
            'file' => UploadedFile::fake()->image('photo.jpg'),
            'owner_token' => $ownerToken,
        ])->json('data.gallery_id');

        return ['gallery_id' => $galleryId, 'owner_token' => $ownerToken];
    }

    /**
     * media_attachments.media_gallery_id remains the internal numeric FK —
     * resolve the public_id back to it for DB assertions.
     */
    private function galleryNumericId(string $publicId): int
    {
        return MediaGallery::where('public_id', $publicId)->value('id');
    }

    #[Test]
    public function it_creates_a_media_attachment_when_creating_an_item_with_a_gallery_id(): void
    {
        $gallery = $this->uploadGallery();

        $response = $this->postJson('/api/v1/items', [
            'sku' => 'SKU-MEDIA-1',
            'name' => 'Sushi Roll',
            'type' => 'PRODUCTO',
            'media_gallery_id' => $gallery['gallery_id'],
            'owner_token' => $gallery['owner_token'],
        ]);

        $response->assertCreated();
        $itemId = $response->json('data.id');

        $this->assertDatabaseHas('media_attachments', [
            'media_gallery_id' => $this->galleryNumericId($gallery['gallery_id']),
            'attachable_type' => Item::class,
            'attachable_id' => $itemId,
            'is_primary' => true,
        ]);
    }

    #[Test]
    public function it_rejects_claiming_another_users_unattached_gallery_on_create(): void
    {
        // Simulates a caller who merely learned another user's in-progress
        // gallery public_id (e.g. leaked in a log or guessed) but doesn't
        // know the owner_token that gallery was created with.
        $gallery = $this->uploadGallery();

        $this->postJson('/api/v1/items', [
            'sku' => 'SKU-MEDIA-HIJACK-1',
            'name' => 'Hijacked Roll',
            'type' => 'PRODUCTO',
            'media_gallery_id' => $gallery['gallery_id'],
        ])->assertForbidden();

        $this->assertSame(0, MediaAttachment::count());
    }

    #[Test]
    public function it_rejects_claiming_another_users_unattached_gallery_on_update(): void
    {
        $item = $this->createItem();
        $gallery = $this->uploadGallery();

        $this->putJson("/api/v1/items/{$item->id}", [
            'media_gallery_id' => $gallery['gallery_id'],
        ])->assertForbidden();

        $this->assertSame(0, MediaAttachment::count());
    }

    #[Test]
    public function it_does_not_create_an_attachment_when_no_gallery_id_is_given(): void
    {
        $response = $this->postJson('/api/v1/items', [
            'sku' => 'SKU-MEDIA-2',
            'name' => 'Sushi Roll No Media',
            'type' => 'PRODUCTO',
        ]);

        $response->assertCreated();

        $this->assertSame(0, MediaAttachment::count());
    }

    #[Test]
    public function it_creates_a_media_attachment_when_updating_an_item_with_a_gallery_id(): void
    {
        $item = $this->createItem();
        $gallery = $this->uploadGallery();

        $response = $this->putJson("/api/v1/items/{$item->id}", [
            'media_gallery_id' => $gallery['gallery_id'],
            'owner_token' => $gallery['owner_token'],
        ]);

        $response->assertOk();

        $this->assertDatabaseHas('media_attachments', [
            'media_gallery_id' => $this->galleryNumericId($gallery['gallery_id']),
            'attachable_type' => Item::class,
            'attachable_id' => $item->id,
            'is_primary' => true,
        ]);
    }

    #[Test]
    public function it_removes_the_previous_attachment_when_the_item_is_attached_to_a_new_gallery(): void
    {
        $item = $this->createItem();
        $firstGallery = $this->uploadGallery();

        $this->putJson("/api/v1/items/{$item->id}", [
            'media_gallery_id' => $firstGallery['gallery_id'],
            'owner_token' => $firstGallery['owner_token'],
        ])->assertOk();

        $secondGallery = $this->uploadGallery();

        $this->putJson("/api/v1/items/{$item->id}", [
            'media_gallery_id' => $secondGallery['gallery_id'],
            'owner_token' => $secondGallery['owner_token'],
        ])->assertOk();

        // Demoting (not removing) the old attachment would leave it permanently
        // unreachable by media:cleanup-orphans, which only sweeps galleries with
        // zero attachments.
        $this->assertDatabaseMissing('media_attachments', [
            'media_gallery_id' => $this->galleryNumericId($firstGallery['gallery_id']),
            'attachable_id' => $item->id,
        ]);
        $this->assertDatabaseHas('media_attachments', [
            'media_gallery_id' => $this->galleryNumericId($secondGallery['gallery_id']),
            'attachable_id' => $item->id,
            'is_primary' => true,
        ]);
    }
}
