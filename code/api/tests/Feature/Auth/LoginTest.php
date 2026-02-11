<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Client;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class LoginTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Create a personal access client for Passport token generation
        Client::factory()->asPersonalAccessTokenClient()->create([
            'provider' => 'users',
        ]);
    }

    #[Test]
    public function it_can_login_with_email(): void
    {
        User::factory()->create([
            'email' => 'test@sushigo.com',
            'password' => bcrypt('password123'),
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'test@sushigo.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['status', 'data' => ['token', 'token_type', 'user']]);
    }

    #[Test]
    public function it_can_login_with_phone(): void
    {
        User::factory()->create([
            'email' => null,
            'phone' => '+525512345678',
            'password' => bcrypt('password123'),
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'phone' => '+525512345678',
            'password' => 'password123',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['status', 'data' => ['token', 'token_type', 'user']]);
    }

    #[Test]
    public function it_rejects_login_without_email_or_phone(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'password' => 'password123',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email', 'phone']);
    }

    #[Test]
    public function it_rejects_invalid_email_credentials(): void
    {
        User::factory()->create([
            'email' => 'test@sushigo.com',
            'password' => bcrypt('password123'),
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'test@sushigo.com',
            'password' => 'wrongpassword',
        ]);

        $response->assertStatus(422);
    }

    #[Test]
    public function it_rejects_invalid_phone_credentials(): void
    {
        User::factory()->create([
            'email' => null,
            'phone' => '+525512345678',
            'password' => bcrypt('password123'),
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'phone' => '+525512345678',
            'password' => 'wrongpassword',
        ]);

        $response->assertStatus(422);
    }

    #[Test]
    public function it_rejects_nonexistent_phone(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'phone' => '+525500000000',
            'password' => 'password123',
        ]);

        $response->assertStatus(422);
    }
}
