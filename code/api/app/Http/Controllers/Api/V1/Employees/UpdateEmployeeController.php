<?php

namespace App\Http\Controllers\Api\V1\Employees;

use App\Http\Controllers\Api\V1\Employees\Concerns\LoadsEmployeeUserAvatarRelations;
use App\Http\Controllers\Controller;
use App\Http\Requests\Employees\UpdateEmployeeRequest;
use App\Http\Resources\Employee\EmployeeResource;
use App\Models\Employee;
use App\Services\Media\MediaAttachmentService;
use Illuminate\Support\Facades\DB;

/**
 * @OA\Put(
 *   path="/api/v1/employees/{id}",
 *   summary="Update Employee",
 *   tags={"Employees"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="string"), description="Unique identifier of the employee"),
 *
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/UpdateEmployeeRequest")),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Employee updated successfully",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *              @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *              @OA\Schema(@OA\Property(property="data", ref="#/components/schemas/EmployeeResponse"))
 *           }
 *       )
 *   ),
 *
 *   @OA\Response(response=404, description="Employee not found", @OA\JsonContent(ref="#/components/schemas/ResponseError")),
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class UpdateEmployeeController extends Controller
{
    use LoadsEmployeeUserAvatarRelations;

    public function __invoke(
        UpdateEmployeeRequest $request,
        Employee $employee,
        MediaAttachmentService $mediaAttachmentService
    ): EmployeeResource {
        DB::transaction(function () use ($request, $employee, $mediaAttachmentService) {
            $employee->update($request->employeeFields());

            $roles = $request->roles();
            if ($roles !== null) {
                $employee->syncPositionRoles($roles, $request->user());
            }

            $userFields = $request->userFields();
            if (! empty($userFields) && $employee->user) {
                $employee->user->update($userFields);
            }

            if (($mediaGalleryId = $request->mediaGalleryId()) && $employee->user) {
                $mediaAttachmentService($employee->user, $mediaGalleryId);
            }
        });

        $employee->load(array_merge(['user.roles', 'employmentPeriods.branch'], $this->employeeUserAvatarRelations()));

        return new EmployeeResource($employee);
    }
}
