<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Actions\Auth\VerifyResetTokenAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\VerifyResetTokenRequest;
use Illuminate\Http\JsonResponse;

/**
 * @OA\Post(
 *   path="/api/v1/auth/verify-reset-token",
 *   summary="Verify password reset token",
 *   description="Checks if the combined t param (token.selector) is valid and not expired. Returns a masked version of the account identifier (email or phone).",
 *   tags={"Auth"},
 *   @OA\RequestBody(
 *     required=true,
 *     @OA\JsonContent(ref="#/components/schemas/VerifyResetTokenRequest")
 *   ),
 *   @OA\Response(
 *     response=200,
 *     description="Token is valid",
 *     @OA\JsonContent(
 *       @OA\Property(property="status", type="string", example="success"),
 *       @OA\Property(property="masked_identifier", type="string", example="ju***@example.com")
 *     )
 *   ),
 *   @OA\Response(
 *     response=422,
 *     description="Invalid or expired token"
 *   )
 * )
 */
class VerifyResetTokenController extends Controller
{
    public function __invoke(
        VerifyResetTokenRequest $request,
        VerifyResetTokenAction $action,
    ): JsonResponse {
        $result = $action($request->validated()['t']);

        return response()->json($result);
    }
}
