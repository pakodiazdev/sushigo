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
        // Same eager-loaded chain as MeController — without it, the header avatar (and,
        // for avatar_gallery below, the self-service profile page's uploader) would only
        // reflect the photo after a later /auth/me call (e.g. on refresh), not immediately
        // after login. Unfiltered mediaAssets, not is_primary-only: avatar_gallery below
        // needs the full asset list to hydrate the uploader (see MeController).
        $this->user->load([
            'roles',
            'mediaAttachments' => fn ($query) => $query->where('is_primary', true),
            'mediaAttachments.mediaGallery.mediaAssets',
        ]);

        $avatarGallery = $this->user->mediaAttachments->firstWhere('is_primary', true)?->mediaGallery;

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
                    'avatar_gallery' => $avatarGallery ? [
                        'id' => $avatarGallery->public_id,
                        'assets' => $avatarGallery->mediaAssets->map(fn ($asset) => [
                            'gallery_id' => $avatarGallery->public_id,
                            'asset_id' => $asset->public_id,
                            'url' => $asset->url,
                            'filename' => $asset->filename,
                            'mime_type' => $asset->mime_type,
                            'size' => $asset->size,
                            'position' => $asset->position,
                            'is_primary' => $asset->is_primary,
                        ]),
                    ] : null,
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
