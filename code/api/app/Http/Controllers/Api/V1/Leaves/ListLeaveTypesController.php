<?php

namespace App\Http\Controllers\Api\V1\Leaves;

use App\Http\Controllers\Controller;
use App\Http\Resources\Leave\LeaveTypeResource;
use App\Http\Responses\Common\ResponseEntity;
use App\Models\LeaveType;

/**
 * @OA\Get(
 *   path="/api/v1/leave-types",
 *   summary="List Leave Types",
 *   description="Returns all active leave types ordered by name.",
 *   tags={"Leaves"},
 *   security={{"passport": {}}},
 *
 *   @OA\Response(
 *       response=200,
 *       description="Leave types retrieved successfully",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *              @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *              @OA\Schema(@OA\Property(property="data", type="array", @OA\Items(ref="#/components/schemas/LeaveTypeResponse")))
 *           }
 *       )
 *   ),
 *
 *   @OA\Response(response=401, description="Unauthenticated")
 * )
 */
class ListLeaveTypesController extends Controller
{
    public function __invoke(): ResponseEntity
    {
        $types = LeaveType::where('is_active', true)
            ->orderBy('name')
            ->get();

        $data = $types
            ->map(fn (LeaveType $t) => (new LeaveTypeResource($t))->resolve())
            ->values()
            ->all();

        return new ResponseEntity(data: $data);
    }
}
