<?php

namespace App\Http\Responses\Auth;

use Illuminate\Contracts\Support\Responsable;
use Illuminate\Http\JsonResponse;

/**
 * @OA\Schema(
 *   schema="AuthTokenResponseSchema",
 *
 *   @OA\Property(property="status", type="integer", example=200),
 *   @OA\Property(property="data", type="object",
 *     @OA\Property(property="token", type="string", example="eyJ0eXAiOiJKV1QiLCJhbGc..."),
 *     @OA\Property(property="token_type", type="string", example="Bearer"),
 *     @OA\Property(property="user", ref="#/components/schemas/UserResponse")
 *   )
 * )
 */
class AuthTokenResponse implements Responsable
{
    public function __construct(
        protected string $token,
        protected object $user,
        protected int $status = 200
    ) {}

    public function toResponse($request): JsonResponse
    {
        // Same eager-loaded chain as MeController::avatar_url — without it, the header
        // avatar would only show the photo after a later /auth/me call (e.g. on refresh),
        // not immediately after login.
        $this->user->load([
            'roles',
            'mediaAttachments' => fn ($query) => $query->where('is_primary', true),
            'mediaAttachments.mediaGallery.mediaAssets' => fn ($query) => $query->where('is_primary', true),
        ]);

        return response()->json([
            'status' => $this->status,
            'data' => [
                'token' => $this->token,
                'token_type' => 'Bearer',
                'user' => [
                    'id' => $this->user->id,
                    'name' => $this->user->name,
                    'email' => $this->user->email,
                    'avatar_url' => $this->user->avatarUrl(),
                    'roles' => $this->user->roles->map(fn ($role) => [
                        'id' => $role->id,
                        'name' => $role->name,
                    ]),
                    'permissions' => $this->user->getAllPermissions()->map(fn ($perm) => [
                        'id' => $perm->id,
                        'name' => $perm->name,
                    ]),
                ],
            ],
        ], $this->status);
    }
}
