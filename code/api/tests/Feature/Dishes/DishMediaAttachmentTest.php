<?php

namespace Tests\Feature\Dishes;

use App\Models\Dish;
use App\Models\MediaAttachment;
use App\Models\MediaGallery;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Permission;

/**
 * Dish adopts the same upload-first/attach-on-save media pattern already
 * proven for Item (#377/#378) — see MediaAttachmentService's own docblock,
 * which names Dish as a pending adopter. Create-only: there is still no
 * GET-gallery-assets endpoint, so the frontend uploader (and therefore this
 * backend wiring) only needs to support attaching on create, mirroring
 * ItemMediaAttachmentTest.
 */
class DishMediaAttachmentTest extends DishesTestCase
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
     * created it — both are needed to attach it to a dish, since the
     * dish create request checks isManageableBy() the same way the media
     * endpoints and Item's create request do.
     */
    private function uploadGallery(): array
    {
        $ownerToken = uniqid('token-', true);

        $galleryId = $this->postJson('/api/v1/media/upload', [
            'file' => UploadedFile::fake()->image('photo.jpg'),
            'owner_token' => $ownerToken,
            'context' => 'dish',
        ])->json('data.gallery_id');

        return ['gallery_id' => $galleryId, 'owner_token' => $ownerToken];
    }

    private function galleryNumericId(string $publicId): int
    {
        return MediaGallery::where('public_id', $publicId)->value('id');
    }

    #[Test]
    public function it_creates_a_media_attachment_when_creating_a_dish_with_a_gallery_id(): void
    {
        $category = $this->createCategory();
        $gallery = $this->uploadGallery();

        $response = $this->postJson('/api/v1/dishes', [
            'dish_category_id' => $category->public_id,
            'name' => 'California Roll',
            'base_price' => 120.00,
            'media_gallery_id' => $gallery['gallery_id'],
            'owner_token' => $gallery['owner_token'],
        ]);

        $response->assertCreated();
        $dishId = Dish::where('name', 'California Roll')->value('id');

        $this->assertDatabaseHas('media_attachments', [
            'media_gallery_id' => $this->galleryNumericId($gallery['gallery_id']),
            'attachable_type' => Dish::class,
            'attachable_id' => $dishId,
            'is_primary' => true,
        ]);
    }

    #[Test]
    public function it_exposes_photo_url_once_a_dish_has_an_attached_gallery(): void
    {
        $category = $this->createCategory();
        $gallery = $this->uploadGallery();

        $response = $this->postJson('/api/v1/dishes', [
            'dish_category_id' => $category->public_id,
            'name' => 'California Roll',
            'base_price' => 120.00,
            'media_gallery_id' => $gallery['gallery_id'],
            'owner_token' => $gallery['owner_token'],
        ]);

        $response->assertCreated();
        $this->assertIsString($response->json('data.photo_url'));

        $publicId = $response->json('data.id');
        $show = $this->getJson("/api/v1/dishes/{$publicId}");
        $show->assertStatus(200);
        $this->assertIsString($show->json('data.photo_url'));
    }

    #[Test]
    public function it_returns_a_null_photo_url_for_a_dish_without_a_gallery(): void
    {
        $dish = $this->createDish();

        $response = $this->getJson("/api/v1/dishes/{$dish->public_id}");

        $response->assertStatus(200)->assertJsonPath('data.photo_url', null);
    }

    #[Test]
    public function it_rejects_claiming_another_users_unattached_gallery_on_create(): void
    {
        $category = $this->createCategory();
        $gallery = $this->uploadGallery();

        $this->postJson('/api/v1/dishes', [
            'dish_category_id' => $category->public_id,
            'name' => 'Hijacked Roll',
            'base_price' => 50,
            'media_gallery_id' => $gallery['gallery_id'],
        ])->assertForbidden();

        $this->assertSame(0, MediaAttachment::count());
    }

    #[Test]
    public function it_does_not_create_an_attachment_when_no_gallery_id_is_given(): void
    {
        $category = $this->createCategory();

        $response = $this->postJson('/api/v1/dishes', [
            'dish_category_id' => $category->public_id,
            'name' => 'No Media Roll',
            'base_price' => 50,
        ]);

        $response->assertCreated();
        $this->assertSame(0, MediaAttachment::count());
    }
}
