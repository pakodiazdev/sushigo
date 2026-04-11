<?php

namespace App\Http\Controllers\Api\V1\Employees;

use App\Http\Controllers\Controller;
use App\Http\Resources\Employee\UserPermissionsResource;
use App\Models\Employee;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GetUserPermissionsController extends Controller
{
    public function __invoke(Request $request, Employee $employee): JsonResponse
    {
        $user = $employee->user;

        if ($user === null) {
            return response()->json([
                'status' => 404,
                'message' => 'Este empleado no tiene una cuenta de usuario vinculada.',
            ], 404);
        }

        return (new UserPermissionsResource($user))
            ->response()
            ->setStatusCode(200);
    }
}
