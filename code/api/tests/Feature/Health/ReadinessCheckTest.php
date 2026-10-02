<?php

namespace Tests\Feature\Health;

use Illuminate\Support\Facades\DB;
use Laravel\Passport\Passport;
use Tests\TestCase;

/**
 * /api/v1/health/ready — the candidate-revision readiness gate Production's deploy pipeline (#636)
 * checks before shifting traffic. Unlike /api/v1/health (DB only, used by the compose/E2E
 * healthchecks), it also validates APP_KEY, APP_URL and the Passport OAuth key pair.
 */
class ReadinessCheckTest extends TestCase
{
    private string $keyDir;

    protected function setUp(): void
    {
        parent::setUp();

        $this->keyDir = sys_get_temp_dir().'/readiness-keys-'.uniqid();
        mkdir($this->keyDir);

        [$private, $public] = $this->generateKeyPair();
        file_put_contents($this->keyDir.'/oauth-private.key', $private);
        file_put_contents($this->keyDir.'/oauth-public.key', $public);

        Passport::loadKeysFrom($this->keyDir);
        config([
            'passport.private_key' => null,
            'passport.public_key' => null,
            'app.key' => 'base64:'.base64_encode(random_bytes(32)),
            'app.cipher' => 'AES-256-CBC',
            'app.url' => 'https://admin.sushigo-romita.com',
        ]);
    }

    protected function tearDown(): void
    {
        foreach (glob($this->keyDir.'/*') ?: [] as $file) {
            unlink($file);
        }
        rmdir($this->keyDir);
        Passport::loadKeysFrom(storage_path());

        parent::tearDown();
    }

    public function test_returns_ok_when_every_check_passes(): void
    {
        $this->getJson('/api/v1/health/ready')
            ->assertOk()
            ->assertExactJson([
                'status' => 'ok',
                'checks' => [
                    'database' => 'ok',
                    'app_key' => 'ok',
                    'app_url' => 'ok',
                    'oauth_keys' => 'ok',
                ],
            ]);
    }

    public function test_is_reachable_without_authentication_and_leaks_no_secret_material(): void
    {
        $response = $this->getJson('/api/v1/health/ready')->assertOk();

        $body = $response->getContent();
        $this->assertStringNotContainsString((string) config('app.key'), $body);
        $this->assertStringNotContainsString('BEGIN', $body);
    }

    public function test_fails_when_app_key_is_missing(): void
    {
        config(['app.key' => '']);

        $this->getJson('/api/v1/health/ready')
            ->assertStatus(503)
            ->assertJsonPath('status', 'error')
            ->assertJsonPath('checks.app_key', 'error')
            ->assertJsonPath('checks.database', 'ok');
    }

    public function test_fails_when_app_key_has_the_wrong_length_for_the_cipher(): void
    {
        config(['app.key' => 'base64:'.base64_encode(random_bytes(16))]);

        $this->getJson('/api/v1/health/ready')
            ->assertStatus(503)
            ->assertJsonPath('checks.app_key', 'error');
    }

    public function test_accepts_a_raw_non_base64_app_key_of_the_right_length(): void
    {
        config(['app.key' => str_repeat('k', 32)]);

        $this->getJson('/api/v1/health/ready')
            ->assertOk()
            ->assertJsonPath('checks.app_key', 'ok');
    }

    public function test_fails_when_app_url_is_missing(): void
    {
        config(['app.url' => '']);

        $this->getJson('/api/v1/health/ready')
            ->assertStatus(503)
            ->assertJsonPath('checks.app_url', 'error');
    }

    public function test_fails_when_app_url_is_not_an_absolute_http_url(): void
    {
        config(['app.url' => '/api/v1']);

        $this->getJson('/api/v1/health/ready')
            ->assertStatus(503)
            ->assertJsonPath('checks.app_url', 'error');

        config(['app.url' => 'ftp://admin.sushigo-romita.com']);

        $this->getJson('/api/v1/health/ready')
            ->assertStatus(503)
            ->assertJsonPath('checks.app_url', 'error');
    }

    public function test_fails_when_the_private_oauth_key_file_is_missing(): void
    {
        unlink($this->keyDir.'/oauth-private.key');

        $this->getJson('/api/v1/health/ready')
            ->assertStatus(503)
            ->assertJsonPath('checks.oauth_keys', 'error');
    }

    public function test_fails_when_the_private_oauth_key_file_is_empty(): void
    {
        file_put_contents($this->keyDir.'/oauth-private.key', '');

        $this->getJson('/api/v1/health/ready')
            ->assertStatus(503)
            ->assertJsonPath('checks.oauth_keys', 'error');
    }

    public function test_fails_when_the_public_oauth_key_file_is_not_a_valid_key(): void
    {
        file_put_contents($this->keyDir.'/oauth-public.key', 'not a pem key');

        $this->getJson('/api/v1/health/ready')
            ->assertStatus(503)
            ->assertJsonPath('checks.oauth_keys', 'error');
    }

    public function test_uses_inline_passport_keys_from_config_when_set(): void
    {
        [$private, $public] = $this->generateKeyPair();
        unlink($this->keyDir.'/oauth-private.key');
        unlink($this->keyDir.'/oauth-public.key');
        config(['passport.private_key' => $private, 'passport.public_key' => $public]);

        $this->getJson('/api/v1/health/ready')
            ->assertOk()
            ->assertJsonPath('checks.oauth_keys', 'ok');
    }

    public function test_fails_when_inline_passport_key_is_invalid(): void
    {
        config(['passport.private_key' => 'garbage', 'passport.public_key' => 'garbage']);

        $this->getJson('/api/v1/health/ready')
            ->assertStatus(503)
            ->assertJsonPath('checks.oauth_keys', 'error');
    }

    public function test_fails_when_the_database_is_unreachable(): void
    {
        $default = config('database.default');
        config([
            'database.connections.unreachable' => array_merge(
                config("database.connections.{$default}"),
                ['host' => '127.0.0.1', 'port' => 1],
            ),
            'database.default' => 'unreachable',
        ]);

        try {
            $response = $this->getJson('/api/v1/health/ready');
        } finally {
            config(['database.default' => $default]);
            DB::purge('unreachable');
        }

        $response->assertStatus(503)
            ->assertJsonPath('checks.database', 'error')
            ->assertJsonPath('checks.app_key', 'ok');
        $this->assertStringNotContainsString('127.0.0.1', $response->getContent());
    }

    public function test_existing_liveness_endpoint_is_unchanged(): void
    {
        $this->getJson('/api/v1/health')
            ->assertOk()
            ->assertJsonPath('status', 'ok')
            ->assertJsonPath('database.status', 'ok');
    }

    /**
     * @return array{0: string, 1: string}
     */
    private function generateKeyPair(): array
    {
        $resource = openssl_pkey_new(['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA]);
        openssl_pkey_export($resource, $private);
        $public = openssl_pkey_get_details($resource)['key'];

        return [$private, $public];
    }
}
