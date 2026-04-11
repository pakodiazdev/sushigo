<?php

namespace App\Http\Controllers\Api\V1\Employees;

use App\Http\Controllers\Controller;
use App\Http\Resources\Employee\UserPermissionsResource;
use App\Models\Employee;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @OA\Get(
 *     path="/api/v1/employees/{employee}/permissions",
 *     summary="Get effective permissions for an employee's user account",
 *     tags={"Employees"},
 *     security={{"passport": {}}},
 *
 *     @OA\Parameter(name="employee", in="path", required=true, @OA\Schema(type="string"), description="Employee public_id (ULID)"),
 *
 *     @OA\Response(
 *         response=200,
 *         description="Grouped permission list with source (role|direct|none) per permission",
 *
 *         @OA\JsonContent(
 *
 *             @OA\Property(property="status", type="integer", example=200),
 *             @OA\Property(property="data",   ref="#/components/schemas/UserPermissionsResponse")
 *         )
 *     ),
 *
 *     @OA\Response(response=401, description="Unauthenticated"),
 *     @OA\Response(response=403, description="Forbidden — requires users.show permission"),
 *     @OA\Response(response=404, description="Employee has no linked user account")
 * )
 */
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
