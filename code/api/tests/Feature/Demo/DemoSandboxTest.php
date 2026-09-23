<?php

namespace Tests\Feature\Demo;

use App\Models\User;
use App\Support\Demo\DemoSandbox;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\StrayRequestException;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\RateLimiter;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class DemoSandboxTest extends TestCase
{
    use RefreshDatabase;

    private function enterDemo(): void
    {
        app()->detectEnvironment(fn () => 'demo');
    }

    protected function tearDown(): void
    {
        RateLimiter::clear('demo-api|127.0.0.1');
        RateLimiter::clear('demo-auth|127.0.0.1');

        parent::tearDown();
    }

    /**
     * @return array<string, array{0: string, 1: string}>
     */
    public static function blockedPublicRoutes(): array
    {
        return [
            'self registration' => ['post', '/api/v1/auth/register'],
            'forgot password' => ['post', '/api/v1/auth/forgot-password'],
            'verify reset token' => ['post', '/api/v1/auth/verify-reset-token'],
            'reset password' => ['post', '/api/v1/auth/reset-password'],
        ];
    }

    #[Test]
    #[DataProvider('blockedPublicRoutes')]
    public function demo_blocks_account_mutation_routes(string $method, string $uri): void
    {
        $this->enterDemo();

        $this->json($method, $uri, ['email' => 'visitor@example.com'])
            ->assertForbidden()
            ->assertJsonPath('message', DemoSandbox::BLOCKED_MESSAGE);
    }

    #[Test]
    public function demo_blocks_avatar_upload_for_signed_in_users(): void
    {
        $this->enterDemo();
        Passport::actingAs(User::factory()->create());

        $this->patchJson('/api/v1/auth/me/avatar', [])
            ->assertForbidden()
            ->assertJsonPath('message', DemoSandbox::BLOCKED_MESSAGE);
    }

    #[Test]
    public function outside_demo_account_routes_are_not_blocked(): void
    {
        $response = $this->postJson('/api/v1/auth/forgot-password', []);

        $this->assertNotSame(403, $response->status());
    }

    #[Test]
    public function demo_throttles_login_attempts_per_ip(): void
    {
        $this->enterDemo();
        Config::set('demo.rate_limits.auth_per_minute', 2);

        $this->postJson('/api/v1/auth/login', [])->assertStatus(422);
        $this->postJson('/api/v1/auth/login', [])->assertStatus(422);
        $this->postJson('/api/v1/auth/login', [])
            ->assertStatus(429)
            ->assertHeader('Retry-After');
    }

    #[Test]
    public function demo_throttles_general_api_traffic_per_ip(): void
    {
        $this->enterDemo();
        Config::set('demo.rate_limits.api_per_minute', 2);

        $this->getJson('/api/v1/app-info')->assertOk();
        $this->getJson('/api/v1/app-info')->assertOk();
        $this->getJson('/api/v1/app-info')->assertStatus(429);
    }

    #[Test]
    public function health_checks_are_never_throttled_so_deploy_probes_stay_reliable(): void
    {
        $this->enterDemo();
        Config::set('demo.rate_limits.api_per_minute', 1);

        $this->getJson('/api/v1/health')->assertOk();
        $this->getJson('/api/v1/health')->assertOk();
    }

    #[Test]
    public function outside_demo_no_demo_rate_limit_is_applied(): void
    {
        Config::set('demo.rate_limits.api_per_minute', 1);

        $this->getJson('/api/v1/app-info')->assertOk();
        $this->getJson('/api/v1/app-info')->assertOk();
    }

    #[Test]
    public function apply_forces_mail_to_the_log_driver_and_blocks_outbound_http(): void
    {
        Config::set('mail.default', 'smtp');

        DemoSandbox::apply();

        $this->assertSame('log', config('mail.default'));
        $this->expectException(StrayRequestException::class);
        Http::get('https://example.com/webhook');
    }
}
