<?php

namespace App\Http\Controllers\Api\V1\OperatingUnit;

use App\Http\Controllers\Controller;
use App\Http\Requests\OperatingUnit\UpdateOperatingUnitRequest;
use App\Models\OperatingUnit;

/**
 * @OA\Put(
 *   path="/api/v1/operating-units/{id}",
 *   summary="Update an existing operating unit",
 *   tags={"Operating Units"},
 *   security={{"bearerAuth":{}}},
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/UpdateOperatingUnitRequest")),
 *   @OA\Response(response=200, description="Operating unit updated successfully"),
 *   @OA\Response(response=404, description="Operating unit not found"),
 *   @OA\Response(response=422, description="Validation error")
 * )
 */
class UpdateOperatingUnitController extends Controller
{
    public function __invoke(UpdateOperatingUnitRequest $request, int $id)
    {
        $operatingUnit = OperatingUnit::findOrFail($id);
        $operatingUnit->update($request->validated());

        return response()->json([
            'message' => 'Operating unit updated successfully',
            'data' => $operatingUnit->load('branch'),
        ]);
    }
}
