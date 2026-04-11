<?php

namespace App\Http\Controllers\Api\V1\Employees;

use App\Http\Controllers\Controller;
use App\Http\Requests\Employees\SyncUserPermissionsRequest;
use App\Http\Resources\Employee\UserPermissionsResource;
use App\Models\Employee;
use Illuminate\Http\JsonResponse;

/**
 * @OA\Put(
 *     path="/api/v1/employees/{employee}/permissions",
 *     summary="Grant or revoke direct permissions on an employee's user account",
 *     tags={"Employees"},
 *     security={{"passport": {}}},
 *
 *     @OA\Parameter(name="employee", in="path", required=true, @OA\Schema(type="string"), description="Employee public_id (ULID)"),
 *
 *     @OA\RequestBody(
 *         required=true,
 *
 *         @OA\JsonContent(ref="#/components/schemas/SyncUserPermissionsRequest")
 *     ),
 *
 *     @OA\Response(
 *         response=200,
 *         description="Updated grouped permission list",
 *
 *         @OA\JsonContent(
 *
 *             @OA\Property(property="status", type="integer", example=200),
 *             @OA\Property(property="data",   ref="#/components/schemas/UserPermissionsResponse")
 *         )
 *     ),
 *
 *     @OA\Response(response=401, description="Unauthenticated"),
 *     @OA\Response(response=403, description="Forbidden — requires users.update permission"),
 *     @OA\Response(response=404, description="Employee has no linked user account"),
 *     @OA\Response(response=422, description="Validation error — unknown permission slug")
 * )
 */
class SyncUserDirectPermissionsController extends Controller
{
    public function __invoke(SyncUserPermissionsRequest $request, Employee $employee): JsonResponse
    {
        $user = $request->getValidatedUser();

        $grant = $request->input('grant', []);
        $revoke = $request->input('revoke', []);

        if (! empty($grant)) {
            $user->givePermissionTo($grant);
        }

        if (! empty($revoke)) {
            $user->revokePermissionTo($revoke);
        }

        return (new UserPermissionsResource($user->fresh()))
            ->response()
            ->setStatusCode(200);
    }
}
