<?php

namespace App\Services\Testing;

use App\Contracts\PasswordResetTokenRecorder;
use Illuminate\Support\Facades\File;

/**
 * Writes password reset links to storage/testing/reset-links/{email}.txt
 * so Cypress and other test tools can retrieve them without Mailhog.
 *
 * Two-layer protection against accidental production use:
 * 1. AppServiceProvider only binds this class in testing/dev environments
 * 2. record() requires LOG_RESET_LINK=true in .env — without it, nothing is written
 *
 * @see doc/conventions/testing/test-environment-services.md
 */
class FileTokenRecorder implements PasswordResetTokenRecorder
{
    private function isEnabled(): bool
    {
        return config('app.log_reset_link', false);
    }

    private function directory(): string
    {
        return storage_path('testing/reset-links');
    }

    private function filePath(string $email): string
    {
        // Encode the full email to keep filenames filesystem-safe without
        // introducing collisions between distinct valid email addresses.
        $safe = rawurlencode($email);

        return $this->directory().'/'.$safe.'.txt';
    }

    public function record(string $email, string $resetLink): void
    {
        if (! $this->isEnabled()) {
            return;
        }

        File::ensureDirectoryExists($this->directory());
        File::put($this->filePath($email), $resetLink);
    }

    public function retrieve(string $email): ?string
    {
        $path = $this->filePath($email);

        if (! File::exists($path)) {
            return null;
        }

        return trim(File::get($path));
    }

    public function clear(): void
    {
        if (File::isDirectory($this->directory())) {
            File::deleteDirectory($this->directory());
        }
    }
}
