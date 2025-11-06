<?php

namespace App\Http\Controllers\Api\V1\OperatingUnitUser;

use App\Http\Controllers\Controller;
use App\Http\Requests\OperatingUnitUser\AddUserToOperatingUnitRequest;
use App\Http\Responses\Common\ResponseEntity;
use App\Models\OperatingUnit;
use App\Models\User;

/**
 * @OA\Post(
 *   path="/api/v1/operating-units/{id}/users",
 *   summary="Add User to Operating Unit",
 *   tags={"Operating Unit Users"},
 *   security={{"passport": {}}},
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/AddUserToOperatingUnitRequest")),
 *   @OA\Response(response=200, description="Success", @OA\JsonContent(ref="#/components/schemas/ResponseEntity")),
 *   @OA\Response(response=404, description="Not Found"),
 *   @OA\Response(response=409, description="User already assigned"),
 * )
 */
class AddUserToOperatingUnitController extends Controller
{
    public function __invoke(AddUserToOperatingUnitRequest $request, int $id)
    {
        $operatingUnit = OperatingUnit::findOrFail($id);
        $user = User::findOrFail($request->user_id);

        // Check if user is already assigned
        if ($operatingUnit->users()->where('user_id', $user->id)->exists()) {
            return response()->json([
                'status' => 409,
                'message' => 'User is already assigned to this operating unit',
                'errors' => [],
            ], 409);
        }

        // Attach user to operating unit
        $operatingUnit->users()->attach($user->id);

        return new ResponseEntity(
            data: [
                'message' => 'User added to operating unit successfully',
                'operating_unit' => [
                    'id' => $operatingUnit->id,
                    'name' => $operatingUnit->name,
                    'type' => $operatingUnit->type,
                ],
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                ],
            ]
        );
    }
}
