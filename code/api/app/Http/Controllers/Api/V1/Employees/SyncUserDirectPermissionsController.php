<?php

namespace App\Http\Controllers\Api\V1\Employees;

use App\Http\Controllers\Controller;
use App\Http\Requests\Employees\SyncUserPermissionsRequest;
use App\Http\Resources\Employee\UserPermissionsResource;
use App\Models\Employee;
use Illuminate\Http\JsonResponse;

class SyncUserDirectPermissionsController extends Controller
{
    public function __invoke(SyncUserPermissionsRequest $request, Employee $employee): JsonResponse
    {
        $user = $employee->user;

        if ($user === null) {
            return response()->json([
                'status' => 404,
                'message' => 'Este empleado no tiene una cuenta de usuario vinculada.',
            ], 404);
        }

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
