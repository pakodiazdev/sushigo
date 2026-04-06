<?php

namespace App\Contracts;

/**
 * Records password reset tokens/links for retrieval by test infrastructure.
 *
 * In production, the NullTokenRecorder is bound (no-op).
 * In testing/dev, the FileTokenRecorder writes links to storage/testing/
 * so Cypress can retrieve them without depending on Mailhog.
 *
 * @see doc/conventions/testing/test-environment-services.md
 */
interface PasswordResetTokenRecorder
{
    /**
     * Record a password reset link for the given email.
     */
    public function record(string $email, string $resetLink): void;

    /**
     * Retrieve the most recent reset link for the given email, or null.
     */
    public function retrieve(string $email): ?string;

    /**
     * Clear all recorded reset links.
     */
    public function clear(): void;
}
