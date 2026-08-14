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
}
