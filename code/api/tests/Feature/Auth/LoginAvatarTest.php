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

    #[Test]
    public function login_response_exposes_null_avatar_gallery_when_the_user_has_no_avatar(): void
    {
        User::factory()->create([
            'email' => 'noavatargallery@sushigo.com',
            'password' => bcrypt('password123'),
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'noavatargallery@sushigo.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(200);
        $this->assertArrayHasKey('avatar_gallery', $response->json('data.user'));
        $this->assertNull($response->json('data.user.avatar_gallery'));
    }

    #[Test]
    public function login_response_exposes_the_full_avatar_gallery_so_a_user_going_straight_from_login_to_the_profile_page_sees_it(): void
    {
        // #420 — the profile page hydrates its uploader from user.avatar_gallery, but
        // usePerfilPage never calls GET /auth/me itself: initializeAuth() only does that
        // on a fresh page load, and login() marks the store as already initialized, so
        // the login response is the only source of avatar_gallery for the rest of that
        // session. Without this, a user who signs in and goes straight to their profile
        // sees an empty photo picker even though they already have a photo.
        $user = User::factory()->create([
            'email' => 'withavatargallery@sushigo.com',
            'password' => bcrypt('password123'),
        ]);

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

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'withavatargallery@sushigo.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(200);
        $this->assertSame($gallery->public_id, $response->json('data.user.avatar_gallery.id'));
        $assets = $response->json('data.user.avatar_gallery.assets');
        $this->assertCount(2, $assets);
        $assetIds = array_column($assets, 'asset_id');
        $this->assertContains($first->public_id, $assetIds);
        $this->assertContains($second->public_id, $assetIds);
    }
}
