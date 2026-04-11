<?php

namespace App\Http\Controllers\Api\V1\Employees;

use App\Http\Controllers\Controller;
use App\Http\Requests\Employees\GetUserPermissionsRequest;
use App\Http\Resources\Employee\UserPermissionsResource;
use App\Models\Employee;
use Illuminate\Http\JsonResponse;

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
    public function __invoke(GetUserPermissionsRequest $request, Employee $employee): JsonResponse
    {
        return (new UserPermissionsResource($request->getValidatedUser()))
            ->response()
            ->setStatusCode(200);
    }
}
