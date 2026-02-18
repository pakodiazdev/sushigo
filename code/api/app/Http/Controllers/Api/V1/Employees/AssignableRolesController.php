<?php

namespace App\Http\Controllers\Api\V1\Employees;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @OA\Get(
 *   path="/api/v1/employees/assignable-roles",
 *   summary="List assignable position roles for the current user",
 *   tags={"Employees"},
 *   security={{"passport": {}}},
 *   @OA\Response(
 *       response=200,
 *       description="List of roles the authenticated user can assign",
 *       @OA\JsonContent(
 *           @OA\Property(property="status", type="integer", example=200),
 *           @OA\Property(property="data", type="array", @OA\Items(type="string"))
 *       )
 *   ),
 *   @OA\Response(response=401, description="Unauthenticated")
 * )
 */
class AssignableRolesController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $roles = Employee::getAssignableRolesFor($request->user());

        return response()->json([
            'status' => 200,
            'data'   => array_values($roles),
        ]);
    }
}
