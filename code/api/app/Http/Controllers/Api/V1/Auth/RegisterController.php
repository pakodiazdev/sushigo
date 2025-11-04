<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Actions\Auth\RegisterUser;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Responses\Auth\AuthTokenResponse;

class RegisterController extends Controller
{
    public function __construct(private RegisterUser $action) {}

    /**
     * @OA\Post(
     *   path="/api/v1/auth/register",
     *   summary="Register a new user",
     *   tags={"Authentication"},
     *   @OA\RequestBody(
     *       required=true,
     *       @OA\JsonContent(ref="#/components/schemas/RegisterRequestSchema")
     *   ),
     *   @OA\Response(
     *       response=201,
     *       description="User registered successfully",
     *       @OA\JsonContent(ref="#/components/schemas/AuthTokenResponseSchema")
     *   ),
     *   @OA\Response(
     *       response=422,
     *       description="Validation error",
     *       @OA\JsonContent(ref="#/components/schemas/ResponseError")
     *   )
     * )
     */
    public function __invoke(RegisterRequest $request)
    {
        $user = ($this->action)($request->validated());
        $token = $user->createToken('auth_token')->accessToken;

        return new AuthTokenResponse(
            token: $token,
            user: $user,
            status: 201
        );
    }
}
