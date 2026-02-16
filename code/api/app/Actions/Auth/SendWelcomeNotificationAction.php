<?php

namespace App\Actions\Auth;

use App\Models\User;
use App\Notifications\WelcomeEmployeeNotification;
use App\Services\Notifications\WhatsAppService;
use Illuminate\Support\Facades\Password;

class SendWelcomeNotificationAction
{
    public function __construct(
        private readonly WhatsAppService $whatsAppService,
    ) {}

    public function __invoke(User $user): void
    {
        $token = Password::broker()->createToken($user);
        $resetUrl = $this->buildResetUrl($token, $user);

        if ($user->email) {
            $user->notify(new WelcomeEmployeeNotification($resetUrl));
        }

        if ($user->phone) {
            $this->whatsAppService->sendPasswordResetLink($user->phone, $resetUrl);
        }
    }

    private function buildResetUrl(string $token, User $user): string
    {
        $frontendUrl = config('app.frontend_url', 'https://sushigo.local');
        $identifier = $user->email ?? $user->phone;

        return "{$frontendUrl}/reset-password?token={$token}&identifier=" . urlencode($identifier);
    }
}
