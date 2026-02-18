<?php

namespace App\Actions\Auth;

use App\Models\User;
use App\Repositories\UserRepository;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class VerifyResetTokenAction
{
    public function __construct(
        private readonly UserRepository $userRepository,
    ) {}

    public function __invoke(string $t): array
    {
        [$plainToken, $selector] = $this->parseT($t);

        $record = $this->userRepository->findByResetSelector($selector);

        if (! $record || ! Hash::check($plainToken, $record->token)) {
            $this->throwInvalid();
        }

        $user = User::where(function ($q) use ($record) {
            $q->where('email', $record->email)
              ->orWhere('phone', $record->email);
        })->first();

        if (! $user) {
            $this->throwInvalid();
        }

        return [
            'status'            => 'success',
            'masked_identifier' => $this->maskIdentifier($user),
        ];
    }

    /**
     * Split the combined "t" param into [plainToken, selector].
     * Format: {40-char plainToken}.{24-char selector}
     * Extracted as public so ResetPasswordAction can reuse it.
     */
    public function parseT(string $t): array
    {
        $parts = explode('.', $t, 2);

        if (count($parts) !== 2 || empty($parts[0]) || empty($parts[1])) {
            $this->throwInvalid();
        }

        return [$parts[0], $parts[1]];
    }

    private function throwInvalid(): never
    {
        throw ValidationException::withMessages([
            't' => ['El token de restablecimiento es inválido o ha expirado.'],
        ]);
    }

    private function maskIdentifier(User $user): string
    {
        if ($user->email) {
            [$local, $domain] = explode('@', $user->email, 2);
            $visibleChars = min(3, (int) ceil(strlen($local) / 2));
            $masked = substr($local, 0, $visibleChars) . str_repeat('*', max(1, strlen($local) - $visibleChars));

            return $masked . '@' . $domain;
        }

        $phone   = $user->phone;
        $visible = substr($phone, -4);

        return str_repeat('*', max(1, strlen($phone) - 4)) . $visible;
    }
}
