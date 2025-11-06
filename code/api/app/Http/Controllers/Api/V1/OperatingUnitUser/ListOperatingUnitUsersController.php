<?php

namespace App\Http\Controllers\Api\V1\OperatingUnitUser;

use App\Http\Controllers\Controller;
use App\Http\Requests\OperatingUnitUser\ListOperatingUnitUsersRequest;
use App\Http\Responses\Common\ResponsePaginated;
use App\Models\OperatingUnit;

/**
 * @OA\Get(
 *   path="/api/v1/operating-units/{id}/users",
 *   summary="List Users in Operating Unit",
 *   tags={"Operating Unit Users"},
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
 *   @OA\Parameter(name="per_page", in="query", required=false, @OA\Schema(type="integer")),
 *   @OA\Response(response=200, description="Success", @OA\JsonContent(ref="#/components/schemas/ResponsePaginated")),
 *   @OA\Response(response=404, description="Not Found"),
 * )
 */
class ListOperatingUnitUsersController extends Controller
{
    public function __invoke(ListOperatingUnitUsersRequest $request, int $id)
    {
        $operatingUnit = OperatingUnit::findOrFail($id);

        $perPage = $request->input('per_page', 15);
        
        $users = $operatingUnit->users()
            ->with('roles')
            ->paginate($perPage);

        return new ResponsePaginated($users);
    }
}
