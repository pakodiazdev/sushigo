<?php

namespace App\Actions\Auth;

use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Reset user password using a valid token.
 * Used both for "forgot password" and "welcome employee set password" flows.
 * After a successful reset, automatically logs in the user and returns an access token.
 */
class ResetPasswordAction
{
    public function __invoke(array $data): array
    {
        $credentials = [
            'password' => $data['password'],
            'password_confirmation' => $data['password_confirmation'],
            'token' => $data['token'],
        ];

        if (isset($data['email'])) {
            $credentials['email'] = $data['email'];
        } elseif (isset($data['phone'])) {
            $credentials['phone'] = $data['phone'];
        }

        /** @var User|null $resetUser */
        $resetUser = null;

        $status = Password::reset(
            $credentials,
            function (User $user, string $password) use (&$resetUser) {
                $user->forceFill([
                    'password' => Hash::make($password),
                    'remember_token' => Str::random(60),
                ])->save();

                event(new PasswordReset($user));

                $resetUser = $user;
            }
        );

        if ($status !== Password::PASSWORD_RESET || ! $resetUser) {
            throw ValidationException::withMessages([
                'token' => ['El token de restablecimiento es inválido o ha expirado.'],
            ]);
        }

        // Auto-login: issue a Passport personal access token
        $token = $resetUser->createToken('auth_token')->accessToken;

        return [
            'status' => 'success',
            'message' => 'La contraseña ha sido restablecida exitosamente.',
            'user' => $resetUser,
            'token' => $token,
        ];
    }
}
