<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Actions\Auth\ForgotPasswordAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use Illuminate\Http\JsonResponse;

/**
 * @OA\Post(
 *   path="/api/v1/auth/forgot-password",
 *   summary="Request password reset link",
 *   description="Sends a password reset link via email or WhatsApp",
 *   tags={"Auth"},
 *
 *   @OA\RequestBody(
 *     required=true,
 *
 *     @OA\JsonContent(ref="#/components/schemas/ForgotPasswordRequest")
 *   ),
 *
 *   @OA\Response(
 *     response=200,
 *     description="Reset link sent successfully",
 *
 *     @OA\JsonContent(
 *
 *       @OA\Property(property="status", type="string", example="success"),
 *       @OA\Property(property="message", type="string")
 *     )
 *   )
 * )
 */
class ForgotPasswordController extends Controller
{
    public function __invoke(
        ForgotPasswordRequest $request,
        ForgotPasswordAction $action,
    ): JsonResponse {
        $result = $action($request->validated());

        return response()->json($result);
    }
}
