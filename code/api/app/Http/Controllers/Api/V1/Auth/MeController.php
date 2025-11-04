<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Http\Responses\Common\ResponseEntity;
use Illuminate\Http\Request;

class MeController extends Controller
{
    /**
     * @OA\Get(
     *   path="/api/v1/auth/me",
     *   summary="Get authenticated user information",
     *   tags={"Authentication"},
     *   security={{"passport": {}}, {"bearer": {}}},
     *   @OA\Response(
     *       response=200,
     *       description="User information retrieved successfully",
     *       @OA\JsonContent(
     *           allOf={
     *              @OA\Schema(ref="#/components/schemas/ResponseEntity"),
     *              @OA\Schema(
     *                  @OA\Property(property="data", ref="#/components/schemas/UserResponse")
     *              )
     *           }
     *       )
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
        $user = $request->user();

        return new ResponseEntity(
            data: [
                'id'    => $user->id,
                'name'  => $user->name,
                'email' => $user->email,
            ],
            status: 200
        );
    }
}
