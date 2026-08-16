<?php

namespace Tests\Feature\Auth;

use App\Models\MediaAsset;
use App\Models\MediaGallery;
use App\Models\User;
use App\Services\Media\MediaAttachmentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * #401 — GET /auth/me exposes the authenticated user's avatar_url so the
 * application header can render it without a separate lookup.
 */
class MeAvatarTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('local');
    }

    #[Test]
    public function it_exposes_null_avatar_url_when_the_user_has_no_avatar(): void
    {
        $user = User::factory()->create();
        Passport::actingAs($user);

        $response = $this->getJson('/api/v1/auth/me');

        $response->assertOk();
        $this->assertArrayHasKey('avatar_url', $response->json('data'));
        $this->assertNull($response->json('data.avatar_url'));
    }

    #[Test]
    public function it_exposes_the_primary_avatar_url_when_attached(): void
    {
        $user = User::factory()->create();

        $gallery = MediaGallery::create(['name' => 'Avatar gallery']);
        MediaAsset::create([
            'media_gallery_id' => $gallery->id,
            'path' => 'media/'.uniqid().'.jpg',
            'mime_type' => 'image/jpeg',
            'filename' => 'avatar.jpg',
            'size' => 1024,
            'position' => 0,
            'is_primary' => true,
        ]);
        app(MediaAttachmentService::class)($user, $gallery->id);

        Passport::actingAs($user);

        $response = $this->getJson('/api/v1/auth/me');

        $response->assertOk();
        $this->assertNotNull($response->json('data.avatar_url'));
        // Internal numeric/public media ids must never leak into this response.
        $this->assertArrayNotHasKey('media_gallery_id', $response->json('data'));
    }

    #[Test]
    public function it_exposes_null_avatar_gallery_when_the_user_has_no_avatar(): void
    {
        $user = User::factory()->create();
        Passport::actingAs($user);

        $response = $this->getJson('/api/v1/auth/me');

        $response->assertOk();
        $this->assertArrayHasKey('avatar_gallery', $response->json('data'));
        $this->assertNull($response->json('data.avatar_gallery'));
    }

    #[Test]
    public function it_exposes_the_full_avatar_gallery_so_the_uploader_can_hydrate_across_sessions(): void
    {
        // #420 — a returning user's self-service page must be able to reorder/
        // set-primary/remove/add-to their existing gallery, not just replace it
        // wholesale, which requires the full asset list (not only the primary one).
        $user = User::factory()->create();

        $gallery = MediaGallery::create(['name' => 'Avatar gallery', 'context' => 'avatar']);
        $first = MediaAsset::create([
            'media_gallery_id' => $gallery->id,
            'path' => 'media/'.uniqid().'.jpg',
            'mime_type' => 'image/jpeg',
            'filename' => 'first.jpg',
            'size' => 1024,
            'position' => 0,
            'is_primary' => false,
        ]);
        $second = MediaAsset::create([
            'media_gallery_id' => $gallery->id,
            'path' => 'media/'.uniqid().'.jpg',
            'mime_type' => 'image/jpeg',
            'filename' => 'second.jpg',
            'size' => 1024,
            'position' => 1,
            'is_primary' => true,
        ]);
        app(MediaAttachmentService::class)($user, $gallery->id);

        Passport::actingAs($user);

        $response = $this->getJson('/api/v1/auth/me');

        $response->assertOk();
        $this->assertSame($gallery->public_id, $response->json('data.avatar_gallery.id'));
        $assets = $response->json('data.avatar_gallery.assets');
        $this->assertCount(2, $assets);
        $assetIds = array_column($assets, 'asset_id');
        $this->assertContains($first->public_id, $assetIds);
        $this->assertContains($second->public_id, $assetIds);
    }
}
