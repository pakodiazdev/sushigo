<?php

namespace App\Actions\Auth;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class VerifyResetTokenAction
{
    public function __invoke(string $token): array
    {
        $expireMinutes = config('auth.passwords.users.expire', 60);
        $table = config('auth.passwords.users.table', 'password_reset_tokens');

        $records = DB::table($table)
            ->where('created_at', '>=', now()->subMinutes($expireMinutes))
            ->get();

        $matched = null;
        foreach ($records as $record) {
            if (Hash::check($token, $record->token)) {
                $matched = $record;
                break;
            }
        }

        if (! $matched) {
            throw ValidationException::withMessages([
                'token' => ['El token de restablecimiento es inválido o ha expirado.'],
            ]);
        }

        $user = User::where('email', $matched->email)
            ->orWhere('phone', $matched->email)
            ->first();

        if (! $user) {
            throw ValidationException::withMessages([
                'token' => ['El token de restablecimiento es inválido o ha expirado.'],
            ]);
        }

        return [
            'status' => 'success',
            'masked_identifier' => $this->maskIdentifier($user),
        ];
    }

    private function maskIdentifier(User $user): string
    {
        if ($user->email) {
            [$local, $domain] = explode('@', $user->email, 2);
            $visibleChars = min(3, (int) ceil(strlen($local) / 2));
            $masked = substr($local, 0, $visibleChars) . str_repeat('*', max(1, strlen($local) - $visibleChars));

            return $masked . '@' . $domain;
        }

        $phone = $user->phone;
        $visible = substr($phone, -4);

        return str_repeat('*', max(1, strlen($phone) - 4)) . $visible;
    }
}
