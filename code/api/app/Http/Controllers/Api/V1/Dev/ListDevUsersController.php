<?php

namespace App\Http\Controllers\Api\V1\Dev;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\DevLoginGuard;
use Illuminate\Http\JsonResponse;

class ListDevUsersController extends Controller
{
    public function __invoke(): JsonResponse
    {
        DevLoginGuard::validate();

        $users = User::with(['roles', 'permissions'])->orderBy('name')->get();

        return response()->json([
            'status' => 200,
            'data' => $users->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'roles' => $user->roles->pluck('name')->values(),
                'permissions' => $user->getAllPermissions()->pluck('name')->sort()->values(),
            ]),
        ]);
    }
}
