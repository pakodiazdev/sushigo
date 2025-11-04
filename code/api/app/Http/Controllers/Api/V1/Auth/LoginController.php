<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Actions\Auth\LoginUser;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Responses\Auth\AuthTokenResponse;

class LoginController extends Controller
{
    public function __construct(private LoginUser $action) {}

    /**
     * @OA\Post(
     *   path="/api/v1/auth/login",
     *   summary="Login user",
     *   tags={"Authentication"},
     *   @OA\RequestBody(
     *       required=true,
     *       @OA\JsonContent(ref="#/components/schemas/LoginRequestSchema")
     *   ),
     *   @OA\Response(
     *       response=200,
     *       description="Login successful",
     *       @OA\JsonContent(ref="#/components/schemas/AuthTokenResponseSchema")
     *   ),
     *   @OA\Response(
     *       response=422,
     *       description="Invalid credentials",
     *       @OA\JsonContent(ref="#/components/schemas/ResponseError")
     *   )
     * )
     */
    public function __invoke(LoginRequest $request)
    {
        $result = ($this->action)($request->validated());

        return new AuthTokenResponse(
            token: $result['token'],
            user: $result['user'],
            status: 200
        );
    }
}
