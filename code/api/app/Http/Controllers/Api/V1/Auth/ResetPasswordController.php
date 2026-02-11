<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Actions\Auth\ResetPasswordAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ResetPasswordRequest;
use Illuminate\Http\JsonResponse;

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
 *     description="Password reset successfully",
 *     @OA\JsonContent(
 *       @OA\Property(property="status", type="string", example="success"),
 *       @OA\Property(property="message", type="string")
 *     )
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
    ): JsonResponse {
        $result = $action($request->validated());

        return response()->json($result);
    }
}
