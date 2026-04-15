<?php

namespace Tests\Feature\Dev;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Laravel\Passport\Client;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class DevLoginTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Client::factory()->asPersonalAccessTokenClient()->create([
            'provider' => 'users',
        ]);
    }

    private function enableDevLogin(): void
    {
        Config::set('devlogin.enabled', true);
        Config::set('devlogin.allowed_environments', 'testing,local,dev');
    }

    // -------------------------------------------------------------------------
    // GET /api/v1/dev/users
    // -------------------------------------------------------------------------

    #[Test]
    public function list_dev_users_returns_404_when_feature_is_disabled(): void
    {
        Config::set('devlogin.enabled', false);
        Config::set('devlogin.allowed_environments', 'testing,local,dev');

        $response = $this->getJson('/api/v1/dev/users');

        $response->assertStatus(404);
    }

    #[Test]
    public function list_dev_users_returns_404_when_environment_not_in_allowed_list(): void
    {
        Config::set('devlogin.enabled', true);
        Config::set('devlogin.allowed_environments', 'local,dev');

        $response = $this->getJson('/api/v1/dev/users');

        $response->assertStatus(404);
    }

    #[Test]
    public function list_dev_users_returns_users_when_feature_is_enabled(): void
    {
        $this->enableDevLogin();

        User::factory()->count(3)->create();

        $response = $this->getJson('/api/v1/dev/users');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'data' => [
                    '*' => ['id', 'name', 'email', 'roles'],
                ],
            ]);

        $this->assertCount(3, $response->json('data'));
    }

    // -------------------------------------------------------------------------
    // POST /api/v1/dev/login
    // -------------------------------------------------------------------------

    #[Test]
    public function dev_login_returns_token_for_valid_user_id(): void
    {
        $this->enableDevLogin();

        $user = User::factory()->create();

        $response = $this->postJson('/api/v1/dev/login', [
            'user_id' => $user->id,
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'data' => ['token', 'token_type', 'user'],
            ]);
    }

    #[Test]
    public function dev_login_returns_404_for_invalid_user_id(): void
    {
        $this->enableDevLogin();

        $response = $this->postJson('/api/v1/dev/login', [
            'user_id' => 99999,
        ]);

        $response->assertStatus(404);
    }

    // -------------------------------------------------------------------------
    // Security: production in allowed environments
    // -------------------------------------------------------------------------

    #[Test]
    public function guard_throws_runtime_exception_when_production_in_allowed_environments(): void
    {
        Config::set('devlogin.enabled', true);
        Config::set('devlogin.allowed_environments', 'production,testing');

        $this->withoutExceptionHandling();

        $this->expectException(\RuntimeException::class);

        $this->getJson('/api/v1/dev/users');
    }
}
