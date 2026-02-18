<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Actions\Auth\ResetPasswordAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Http\Responses\Auth\AuthTokenResponse;

/**
 * @OA\Post(
 *   path="/api/v1/auth/reset-password",
 *   summary="Reset password with token",
 *   description="Resets the user password using a valid token",
 *   tags={"Auth"},
 *   @OA\RequestBody(
 *     required=true,
 *     @OA\JsonContent(ref="#/components/schemas/ResetPasswordRequest")
 *   ),
 *   @OA\Response(
 *     response=200,
 *     description="Password reset successfully — returns auth token and user (same shape as login)",
 *     @OA\JsonContent(ref="#/components/schemas/AuthTokenResponseSchema")
 *   ),
 *   @OA\Response(
 *     response=422,
 *     description="Invalid or expired token"
 *   )
 * )
 */
class ResetPasswordController extends Controller
{
    public function __invoke(
        ResetPasswordRequest $request,
        ResetPasswordAction $action,
    ): AuthTokenResponse {
        $result = $action($request->validated());

        return new AuthTokenResponse(
            token: $result['token'],
            user: $result['user'],
        );
    }
}
