<?php

namespace App\Services\Health;

use Illuminate\Encryption\Encrypter;
use Illuminate\Support\Facades\DB;
use Laravel\Passport\Passport;
use Throwable;

/**
 * Candidate-revision readiness checks (#636, TD-07 "Post-deploy health check").
 *
 * /api/v1/health only proves database connectivity, so a revision with a broken APP_KEY, a missing
 * APP_URL, or unreadable OAuth keys still passes it while login/session behavior is silently broken.
 * Production's deploy pipeline gates traffic promotion on these checks instead. Each check reports
 * only "ok" / "error" — never the underlying value or exception message — because the endpoint is
 * public.
 */
class ReadinessChecker
{
    public const OK = 'ok';

    public const ERROR = 'error';

    /**
     * @return array{database: string, app_key: string, app_url: string, oauth_keys: string}
     */
    public function checks(): array
    {
        return [
            'database' => $this->status($this->databaseIsReachable()),
            'app_key' => $this->status($this->appKeyIsValid()),
            'app_url' => $this->status($this->appUrlIsValid()),
            'oauth_keys' => $this->status($this->oauthKeysAreReadable()),
        ];
    }

    /**
     * @param  array<string, string>  $checks
     */
    public function allPassed(array $checks): bool
    {
        return ! in_array(self::ERROR, $checks, true);
    }

    private function databaseIsReachable(): bool
    {
        try {
            DB::connection()->getPdo();

            return true;
        } catch (Throwable) {
            return false;
        }
    }

    private function appKeyIsValid(): bool
    {
        $key = (string) config('app.key');

        if (str_starts_with($key, 'base64:')) {
            $key = (string) base64_decode(substr($key, 7), true);
        }

        return $key !== '' && Encrypter::supported($key, (string) config('app.cipher'));
    }

    private function appUrlIsValid(): bool
    {
        $url = (string) config('app.url');
        $scheme = parse_url($url, PHP_URL_SCHEME);

        return filter_var($url, FILTER_VALIDATE_URL) !== false && in_array($scheme, ['http', 'https'], true);
    }

    /**
     * Mirrors PassportServiceProvider::makeCryptKey(): an inline key in config wins, otherwise the
     * key file under Passport::keyPath() is used.
     */
    private function oauthKeysAreReadable(): bool
    {
        $private = $this->keyMaterial('private');
        $public = $this->keyMaterial('public');

        return $private !== null
            && $public !== null
            && openssl_pkey_get_private($private) !== false
            && openssl_pkey_get_public($public) !== false;
    }

    private function keyMaterial(string $type): ?string
    {
        $inline = config("passport.{$type}_key");

        if (is_string($inline) && $inline !== '') {
            return str_replace('\\n', "\n", $inline);
        }

        $path = Passport::keyPath("oauth-{$type}.key");

        if (! is_file($path) || ! is_readable($path)) {
            return null;
        }

        $contents = file_get_contents($path);

        return $contents === false || $contents === '' ? null : $contents;
    }

    private function status(bool $passed): string
    {
        return $passed ? self::OK : self::ERROR;
    }
}
