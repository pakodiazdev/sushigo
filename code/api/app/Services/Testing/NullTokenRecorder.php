<?php

namespace App\Services\Testing;

use App\Contracts\PasswordResetTokenRecorder;

/**
 * No-op implementation for production — reset links are delivered via email/WhatsApp only.
 */
class NullTokenRecorder implements PasswordResetTokenRecorder
{
    public function record(string $email, string $resetLink): void
    {
        // No-op in production
    }

    public function retrieve(string $email): ?string
    {
        return null;
    }

    public function clear(): void
    {
        // No-op in production
    }
}
