<?php

namespace App\Http\Controllers\Api\V1\OperatingUnitUser;

use App\Http\Controllers\Controller;
use App\Http\Responses\Common\ResponseEntity;
use App\Models\OperatingUnit;

/**
 * @OA\Delete(
 *   path="/api/v1/operating-units/{id}/users/{userId}",
 *   summary="Remove User from Operating Unit",
 *   tags={"Operating Unit Users"},
 *   security={{"passport": {}}},
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
 *   @OA\Parameter(name="userId", in="path", required=true, @OA\Schema(type="integer")),
 *   @OA\Response(response=200, description="Success", @OA\JsonContent(ref="#/components/schemas/ResponseEntity")),
 *   @OA\Response(response=404, description="Not Found or Not Assigned"),
 * )
 */
class RemoveUserFromOperatingUnitController extends Controller
{
    public function __invoke(int $id, int $userId)
    {
        $operatingUnit = OperatingUnit::findOrFail($id);

        // Check if user is assigned
        if (!$operatingUnit->users()->where('user_id', $userId)->exists()) {
            return response()->json([
                'status' => 404,
                'message' => 'User is not assigned to this operating unit',
                'errors' => [],
            ], 404);
        }

        // Detach user from operating unit
        $operatingUnit->users()->detach($userId);

        return new ResponseEntity(
            data: ['message' => 'User removed from operating unit successfully']
        );
    }
}
