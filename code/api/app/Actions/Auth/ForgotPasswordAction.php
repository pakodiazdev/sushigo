<?php

namespace App\Actions\Auth;

use App\Models\User;
use App\Notifications\ResetPasswordNotification;
use App\Services\Notifications\WhatsAppService;
use Illuminate\Support\Facades\Password;

class ForgotPasswordAction
{
    public function __construct(
        private readonly WhatsAppService $whatsAppService,
    ) {}

    public function __invoke(array $data): array
    {
        $field = !empty($data['email']) ? 'email' : 'phone';
        $credentials = [$field => $data[$field]];

        $user = User::where($field, $data[$field])->first();

        if ($user) {
            $token = Password::broker()->createToken($user);
            $resetUrl = $this->buildResetUrl($token, $user);

            if ($user->email) {
                $user->notify(new ResetPasswordNotification($resetUrl));
            }

            if ($user->phone) {
                $this->whatsAppService->sendPasswordResetLink($user->phone, $resetUrl);
            }
        }

        return [
            'status' => 'success',
            'message' => 'Si existe una cuenta, se ha enviado el enlace para restablecer la contraseña.',
        ];
    }

    private function buildResetUrl(string $token, User $user): string
    {
        $frontendUrl = config('app.frontend_url', 'https://sushigo.local');
        $identifier = $user->email ?? $user->phone;

        return "{$frontendUrl}/reset-password?token={$token}&identifier=" . urlencode($identifier);
    }
}
