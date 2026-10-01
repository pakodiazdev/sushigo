<?php

namespace Tests\Feature\Demo;

use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\File;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ReadinessCheckTest extends TestCase
{
    private string $keyDir;

    protected function setUp(): void
    {
        parent::setUp();

        $this->keyDir = storage_path('framework/testing/readiness-keys-'.getmypid());
        File::ensureDirectoryExists($this->keyDir);
        File::put($this->keyDir.'/oauth-private.key', "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n");
        File::put($this->keyDir.'/oauth-public.key', "-----BEGIN PUBLIC KEY-----\nabc\n-----END PUBLIC KEY-----\n");
        Passport::loadKeysFrom($this->keyDir);
        Config::set('passport.private_key', null);
        Config::set('passport.public_key', null);
        Config::set('app.url', 'https://demo.sushigo-romita.com');
    }

    protected function tearDown(): void
    {
        File::deleteDirectory($this->keyDir);
        Passport::loadKeysFrom(storage_path());

        parent::tearDown();
    }

    #[Test]
    public function passes_when_database_app_key_app_url_and_oauth_keys_are_valid(): void
    {
        $this->getJson('/api/v1/health/ready')
            ->assertOk()
            ->assertJsonPath('status', 'ok')
            ->assertJsonPath('checks.database.status', 'ok')
            ->assertJsonPath('checks.app_key.status', 'ok')
            ->assertJsonPath('checks.app_url.status', 'ok')
            ->assertJsonPath('checks.oauth_keys.status', 'ok');
    }

    #[Test]
    public function fails_when_app_key_is_missing(): void
    {
        Config::set('app.key', '');

        $this->getJson('/api/v1/health/ready')
            ->assertStatus(503)
            ->assertJsonPath('status', 'error')
            ->assertJsonPath('checks.app_key.status', 'error');
    }

    #[Test]
    public function fails_when_app_key_does_not_match_the_cipher(): void
    {
        Config::set('app.key', 'base64:'.base64_encode('too-short'));

        $this->getJson('/api/v1/health/ready')
            ->assertStatus(503)
            ->assertJsonPath('checks.app_key.status', 'error');
    }

    #[Test]
    public function fails_when_app_url_is_not_a_valid_url(): void
    {
        Config::set('app.url', 'not a url');

        $this->getJson('/api/v1/health/ready')
            ->assertStatus(503)
            ->assertJsonPath('checks.app_url.status', 'error');
    }

    #[Test]
    public function fails_when_an_oauth_key_file_is_missing(): void
    {
        File::delete($this->keyDir.'/oauth-public.key');

        $this->getJson('/api/v1/health/ready')
            ->assertStatus(503)
            ->assertJsonPath('checks.oauth_keys.status', 'error');
    }

    #[Test]
    public function fails_when_an_oauth_key_file_is_not_a_pem_key(): void
    {
        File::put($this->keyDir.'/oauth-private.key', 'garbage');

        $this->getJson('/api/v1/health/ready')
            ->assertStatus(503)
            ->assertJsonPath('checks.oauth_keys.status', 'error');
    }

    #[Test]
    public function accepts_oauth_keys_supplied_through_passport_config(): void
    {
        File::deleteDirectory($this->keyDir);
        Config::set('passport.private_key', "-----BEGIN RSA PRIVATE KEY-----\nabc\n-----END RSA PRIVATE KEY-----");
        Config::set('passport.public_key', "-----BEGIN PUBLIC KEY-----\nabc\n-----END PUBLIC KEY-----");

        $this->getJson('/api/v1/health/ready')
            ->assertOk()
            ->assertJsonPath('checks.oauth_keys.status', 'ok');
    }

    #[Test]
    public function never_leaks_secret_values_in_the_response(): void
    {
        $content = $this->getJson('/api/v1/health/ready')->getContent();

        $this->assertStringNotContainsString((string) config('app.key'), $content);
        $this->assertStringNotContainsString('BEGIN PRIVATE KEY', $content);
    }
}
