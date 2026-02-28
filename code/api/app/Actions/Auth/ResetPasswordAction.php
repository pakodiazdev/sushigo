<?php

namespace App\Actions\Auth;

use App\Models\User;
use App\Repositories\UserRepository;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ResetPasswordAction
{
    public function __construct(
        private readonly UserRepository $userRepository,
        private readonly VerifyResetTokenAction $verifyAction,
    ) {}

    public function __invoke(array $data): array
    {
        [$plainToken, $selector] = $this->verifyAction->parseT($data['t']);

        $record = $this->userRepository->findByResetSelector($selector);

        if (! $record || ! Hash::check($plainToken, $record->token)) {
            throw ValidationException::withMessages([
                't' => ['El token de restablecimiento es inválido o ha expirado.'],
            ]);
        }

        $user = User::where(function ($q) use ($record) {
            $q->where('email', $record->email)
                ->orWhere('phone', $record->email);
        })->first();

        if (! $user) {
            throw ValidationException::withMessages([
                't' => ['El token de restablecimiento es inválido o ha expirado.'],
            ]);
        }

        $user->forceFill([
            'password' => Hash::make($data['password']),
            'remember_token' => Str::random(60),
        ])->save();

        event(new PasswordReset($user));

        // Delete the token so it cannot be reused
        $this->userRepository->deleteResetToken($record->email);

        $token = $user->createToken('auth_token')->accessToken;

        return [
            'token' => $token,
            'user' => $user,
        ];
    }
}
