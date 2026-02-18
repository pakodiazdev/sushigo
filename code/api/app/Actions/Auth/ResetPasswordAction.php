<?php

namespace App\Actions\Auth;

use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ResetPasswordAction
{
    public function __invoke(array $data): array
    {
        $user = $this->findUserByToken($data['token']);

        $identifier = $user->getEmailForPasswordReset();
        $identifierField = $user->email ? 'email' : 'phone';

        $credentials = [
            'password' => $data['password'],
            'password_confirmation' => $data['password_confirmation'],
            'token' => $data['token'],
            $identifierField => $identifier,
        ];

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

        $token = $resetUser->createToken('auth_token')->accessToken;

        return [
            'status' => 'success',
            'message' => 'La contraseña ha sido restablecida exitosamente.',
            'user' => $resetUser,
            'token' => $token,
        ];
    }

    private function findUserByToken(string $plainToken): User
    {
        $expireMinutes = config('auth.passwords.users.expire', 60);
        $table = config('auth.passwords.users.table', 'password_reset_tokens');

        $records = DB::table($table)
            ->where('created_at', '>=', now()->subMinutes($expireMinutes))
            ->get();

        foreach ($records as $record) {
            if (Hash::check($plainToken, $record->token)) {
                $user = User::where('email', $record->email)
                    ->orWhere('phone', $record->email)
                    ->first();

                if ($user) {
                    return $user;
                }
            }
        }

        throw ValidationException::withMessages([
            'token' => ['El token de restablecimiento es inválido o ha expirado.'],
        ]);
    }
}
