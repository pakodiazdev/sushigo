<?php

namespace App\Http\Responses\Auth;

use Illuminate\Contracts\Support\Responsable;
use Illuminate\Http\JsonResponse;

/**
 * @OA\Schema(
 *   schema="AuthTokenResponseSchema",
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
        return response()->json([
            'status' => $this->status,
            'data'   => [
                'token'      => $this->token,
                'token_type' => 'Bearer',
                'user'       => [
                    'id'    => $this->user->id,
                    'name'  => $this->user->name,
                    'email' => $this->user->email,
                ],
            ],
        ], $this->status);
    }
}
