<?php

namespace App\Actions\Auth;

use App\Contracts\PasswordResetTokenRecorder;
use App\Models\User;
use App\Notifications\ResetPasswordNotification;
use App\Repositories\UserRepository;
use App\Services\Notifications\WhatsAppService;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class ForgotPasswordAction
{
    public function __construct(
        private readonly WhatsAppService $whatsAppService,
        private readonly UserRepository $userRepository,
        private readonly PasswordResetTokenRecorder $tokenRecorder,
    ) {}

    public function __invoke(array $data): array
    {
        $field = ! empty($data['email']) ? 'email' : 'phone';
        $user = User::where($field, $data[$field])->first();

        if ($user) {
            [$resetUrl] = $this->generateResetLink($user);

            if ($user->email) {
                $user->notify(new ResetPasswordNotification($resetUrl));
            }

            if ($user->phone) {
                // full_phone includes country code (e.g. +525512345678) for international delivery
                $this->whatsAppService->sendPasswordResetLink($user->full_phone, $resetUrl);
            }
        }

        return [
            'status' => 'success',
            'message' => 'Si existe una cuenta, se ha enviado el enlace para restablecer la contraseña.',
        ];
    }

    /**
     * Generate a selector+token pair, persist it, and return [resetUrl, plainToken, selector].
     *
     * Extracted as a protected method so SendWelcomeNotificationAction can reuse
     * exactly the same logic without duplication.
     */
    public function generateResetLink(User $user): array
    {
        $selector = Str::random(24);
        $plainToken = Str::random(40);
        $identifier = $user->getEmailForPasswordReset();

        $this->userRepository->createResetToken(
            $identifier,
            $selector,
            Hash::make($plainToken)
        );

        $frontendUrl = config('app.frontend_url', 'https://sushigo.local');
        $resetUrl = "{$frontendUrl}/reset-password?t={$plainToken}.{$selector}";

        // Record the link for test infrastructure (no-op in production)
        $this->tokenRecorder->record($identifier, $resetUrl);

        return [$resetUrl, $plainToken, $selector];
    }
}
