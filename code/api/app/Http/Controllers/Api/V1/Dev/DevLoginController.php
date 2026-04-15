<?php

namespace App\Http\Controllers\Api\V1\Dev;

use App\Http\Controllers\Controller;
use App\Http\Responses\Auth\AuthTokenResponse;
use App\Models\User;
use App\Support\DevLoginGuard;
use Illuminate\Http\Request;

class DevLoginController extends Controller
{
    public function __invoke(Request $request): AuthTokenResponse
    {
        DevLoginGuard::validate();

        $validated = $request->validate([
            'user_id' => ['required', 'integer'],
        ]);

        $user = User::find($validated['user_id']);

        if (! $user) {
            abort(404);
        }

        $token = $user->createToken('dev-debug')->accessToken;

        return new AuthTokenResponse(token: $token, user: $user);
    }
}
