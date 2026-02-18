<?php

namespace App\Actions\Auth;

use App\Models\User;
use App\Notifications\WelcomeEmployeeNotification;
use App\Services\Notifications\WhatsAppService;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password;

class SendWelcomeNotificationAction
{
    public function __construct(
        private readonly WhatsAppService $whatsAppService,
    ) {}

    public function __invoke(User $user): void
    {
        $token = Password::broker()->createToken($user);
        $resetUrl = $this->buildResetUrl($token);

        // Log the reset URL so developers can test password setup
        // without needing to open Mailhog or check WhatsApp.
        Log::info('Welcome notification reset URL', [
            'user' => $user->email ?? $user->phone,
            'reset_url' => $resetUrl,
        ]);

        if ($user->email) {
            $user->notify(new WelcomeEmployeeNotification($resetUrl));
        }

        if ($user->phone) {
            // Use full_phone (country code + national number, e.g. +525512345678)
            // so the WhatsApp provider receives an internationally-formatted number.
            $this->whatsAppService->sendPasswordResetLink($user->full_phone, $resetUrl);
        }
    }

    private function buildResetUrl(string $token): string
    {
        $frontendUrl = config('app.frontend_url', 'https://sushigo.local');

        return "{$frontendUrl}/reset-password?token={$token}";
    }
}
