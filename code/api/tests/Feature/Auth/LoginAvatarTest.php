<?php

namespace Tests\Feature\Auth;

use App\Models\MediaAsset;
use App\Models\MediaGallery;
use App\Models\User;
use App\Services\Media\MediaAttachmentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Laravel\Passport\Client;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * #401 — the login/register/reset-password response (AuthTokenResponse) must expose
 * avatar_url too, not just GET /auth/me — otherwise the header avatar only shows the
 * photo after a later /auth/me call (e.g. on page refresh), not immediately after login.
 */
class LoginAvatarTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('local');

        Client::factory()->asPersonalAccessTokenClient()->create([
            'provider' => 'users',
        ]);
    }

    #[Test]
    public function login_response_exposes_null_avatar_url_when_the_user_has_no_avatar(): void
    {
        User::factory()->create([
            'email' => 'noavatar@sushigo.com',
            'password' => bcrypt('password123'),
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'noavatar@sushigo.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(200);
        $this->assertArrayHasKey('avatar_url', $response->json('data.user'));
        $this->assertNull($response->json('data.user.avatar_url'));
    }

    #[Test]
    public function login_response_exposes_the_primary_avatar_url_when_attached(): void
    {
        $user = User::factory()->create([
            'email' => 'withavatar@sushigo.com',
            'password' => bcrypt('password123'),
        ]);

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

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'withavatar@sushigo.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(200);
        $this->assertNotNull($response->json('data.user.avatar_url'));
    }
}
