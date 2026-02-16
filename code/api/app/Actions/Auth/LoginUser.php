<?php

namespace App\Actions\Auth;

use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class LoginUser
{
    public function __invoke(array $credentials): array
    {
        $loginField = isset($credentials['email']) ? 'email' : 'phone';

        $attemptCredentials = [
            $loginField => $credentials[$loginField],
            'password'  => $credentials['password'],
        ];

        if (!Auth::attempt($attemptCredentials)) {
            throw ValidationException::withMessages([
                $loginField => ['The provided credentials are incorrect.'],
            ]);
        }

        $user = Auth::user();
        $token = $user->createToken('auth_token')->accessToken;

        return [
            'user'  => $user,
            'token' => $token,
        ];
    }
}
