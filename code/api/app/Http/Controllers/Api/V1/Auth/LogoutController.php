<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Http\Responses\Common\ResponseMessage;
use Illuminate\Http\Request;

class LogoutController extends Controller
{
    /**
     * @OA\Post(
     *   path="/api/v1/auth/logout",
     *   summary="Logout user",
     *   tags={"Authentication"},
     *   security={{"passport": {}}, {"bearer": {}}},
     *   @OA\Response(
     *       response=200,
     *       description="Logout successful",
     *       @OA\JsonContent(ref="#/components/schemas/ResponseMessage")
     *   ),
     *   @OA\Response(
     *       response=401,
     *       description="Unauthenticated",
     *       @OA\JsonContent(ref="#/components/schemas/ResponseError")
     *   )
     * )
     */
    public function __invoke(Request $request)
    {
        $request->user()->token()->revoke();

        return new ResponseMessage(
            message: 'Successfully logged out',
            status: 200
        );
    }
}
