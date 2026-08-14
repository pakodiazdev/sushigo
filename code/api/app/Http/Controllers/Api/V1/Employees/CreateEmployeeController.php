<?php

namespace App\Http\Controllers\Api\V1\Employees;

use App\Actions\Employee\CreateEmployeeAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Employees\StoreEmployeeRequest;
use App\Http\Resources\Employee\EmployeeResource;
use App\Models\Employee;
use App\Services\Media\MediaAttachmentService;

/**
 * @OA\Post(
 *   path="/api/v1/employees",
 *   summary="Create Employee",
 *   tags={"Employees"},
 *   security={{"passport": {}}},
 *
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/StoreEmployeeRequest")),
 *
 *   @OA\Response(
 *       response=201,
 *       description="Employee created successfully",
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
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class CreateEmployeeController extends Controller
{
    public function __invoke(
        StoreEmployeeRequest $request,
        CreateEmployeeAction $action,
        MediaAttachmentService $mediaAttachmentService
    ): EmployeeResource {
        $mediaGalleryId = $request->mediaGalleryId();

        // Passed as $afterCreate so the attach runs inside CreateEmployeeAction's own
        // transaction — attaching after the action returns would let a MediaAttachmentService
        // failure leave the employee/user already committed with the upload silently orphaned.
        $employee = $action(
            $request->validated(),
            $mediaGalleryId
                ? function (Employee $employee) use ($mediaAttachmentService, $mediaGalleryId) {
                    $mediaAttachmentService($employee->user, $mediaGalleryId);
                }
            : null
        );

        // Deliberately no extra ->load() call here for the avatar relations: the action
        // already returned $employee with 'user.roles' loaded, and this is a single record
        // (not a list), so User::avatarUrl() lazy-loading the media chain (filtered to
        // is_primary in PHP, correct even unconstrained) costs one trivial extra query. A
        // separate `$employee->load(employeeUserAvatarRelations())` call here would re-fetch
        // 'user' without 'roles', silently discarding it — and, since that reload runs after
        // the transaction has already committed, any failure in it would report the whole
        // request as failed even though the employee (and photo) were already saved.
        return (new EmployeeResource($employee))->setStatusCode(201);
    }
}
