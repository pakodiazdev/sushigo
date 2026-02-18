<?php

namespace App\Actions\Auth;

use App\Models\User;
use App\Notifications\WelcomeEmployeeNotification;
use App\Services\Notifications\WhatsAppService;
use Illuminate\Support\Facades\Log;

class SendWelcomeNotificationAction
{
    public function __construct(
        private readonly WhatsAppService $whatsAppService,
        private readonly ForgotPasswordAction $forgotPasswordAction,
    ) {}

    public function __invoke(User $user): void
    {
        [$resetUrl] = $this->forgotPasswordAction->generateResetLink($user);

        // Log the reset URL so developers can test password setup
        // without needing to open Mailhog or check WhatsApp.
        Log::info('Welcome notification reset URL', [
            'user'      => $user->email ?? $user->phone,
            'reset_url' => $resetUrl,
        ]);

        if ($user->email) {
            $user->notify(new WelcomeEmployeeNotification($resetUrl));
        }

        if ($user->phone) {
            // full_phone includes country code (e.g. +525512345678) for international delivery
            $this->whatsAppService->sendPasswordResetLink($user->full_phone, $resetUrl);
        }
    }
}
