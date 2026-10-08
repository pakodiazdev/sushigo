<?php

namespace App\Services\System;

use Illuminate\Encryption\Encrypter;
use Illuminate\Support\Facades\DB;
use Laravel\Passport\Passport;
use Throwable;

/**
 * Candidate-revision readiness checks for automated deploys (#635, TD-07
 * "Post-deploy health check"). /api/v1/health only proves the database is
 * reachable; a revision with a broken APP_KEY, APP_URL or missing OAuth key
 * would still pass it while login silently fails. Each check reports a status
 * and a non-secret message — never the configured value itself.
 */
class ReadinessChecker
{
    private const OK = 'ok';

    private const ERROR = 'error';

    /**
     * @return array<string, array{status: string, message: string}>
     */
    public function run(): array
    {
        return [
            'database' => $this->database(),
            'app_key' => $this->appKey(),
            'app_url' => $this->appUrl(),
            'oauth_keys' => $this->oauthKeys(),
        ];
    }

    /**
     * @param  array<string, array{status: string, message: string}>  $checks
     */
    public function passes(array $checks): bool
    {
        return collect($checks)->every(fn (array $check) => $check['status'] === self::OK);
    }

    /**
     * @return array{status: string, message: string}
     */
    private function database(): array
    {
        try {
            DB::connection()->getPdo();

            return $this->ok('Database connection successful');
        } catch (Throwable) {
            return $this->error('Database connection failed');
        }
    }

    /**
     * @return array{status: string, message: string}
     */
    private function appKey(): array
    {
        $key = (string) config('app.key');
        $cipher = (string) config('app.cipher');

        if ($key === '') {
            return $this->error('APP_KEY is not set');
        }

        $raw = str_starts_with($key, 'base64:') ? base64_decode(substr($key, 7), true) : $key;

        if ($raw === false || ! Encrypter::supported($raw, $cipher)) {
            return $this->error("APP_KEY is not a valid {$cipher} key");
        }

        return $this->ok('APP_KEY is valid');
    }

    /**
     * @return array{status: string, message: string}
     */
    private function appUrl(): array
    {
        $url = (string) config('app.url');

        if (filter_var($url, FILTER_VALIDATE_URL) === false || ! in_array(parse_url($url, PHP_URL_SCHEME), ['http', 'https'], true)) {
            return $this->error('APP_URL is not a valid http(s) URL');
        }

        return $this->ok('APP_URL is valid');
    }

    /**
     * @return array{status: string, message: string}
     */
    private function oauthKeys(): array
    {
        $private = $this->keyMaterial('passport.private_key', 'oauth-private.key');
        $public = $this->keyMaterial('passport.public_key', 'oauth-public.key');

        if (! $this->isPem($private, 'PRIVATE KEY')) {
            return $this->error('OAuth private key is missing or unreadable');
        }

        if (! $this->isPem($public, 'PUBLIC KEY')) {
            return $this->error('OAuth public key is missing or unreadable');
        }

        return $this->ok('OAuth keys are readable');
    }

    private function keyMaterial(string $configKey, string $file): ?string
    {
        $configured = config($configKey);

        if (is_string($configured) && $configured !== '') {
            return $configured;
        }

        $path = Passport::keyPath($file);

        return is_readable($path) ? (string) file_get_contents($path) : null;
    }

    private function isPem(?string $contents, string $label): bool
    {
        return $contents !== null && str_contains($contents, '-----BEGIN ') && str_contains($contents, $label.'-----');
    }

    /**
     * @return array{status: string, message: string}
     */
    private function ok(string $message): array
    {
        return ['status' => self::OK, 'message' => $message];
    }

    /**
     * @return array{status: string, message: string}
     */
    private function error(string $message): array
    {
        return ['status' => self::ERROR, 'message' => $message];
    }
}
