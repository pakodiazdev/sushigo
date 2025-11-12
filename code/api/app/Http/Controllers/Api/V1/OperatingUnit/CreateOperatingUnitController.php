<?php

namespace App\Http\Controllers\Api\V1\OperatingUnit;

use App\Http\Controllers\Controller;
use App\Http\Requests\OperatingUnit\CreateOperatingUnitRequest;
use App\Models\OperatingUnit;

/**
 * @OA\Post(
 *   path="/api/v1/operating-units",
 *   summary="Create a new operating unit",
 *   tags={"Operating Units"},
 *   security={{"bearerAuth":{}}},
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/CreateOperatingUnitRequest")),
 *   @OA\Response(response=201, description="Operating unit created successfully"),
 *   @OA\Response(response=422, description="Validation error")
 * )
 */
class CreateOperatingUnitController extends Controller
{
    public function __invoke(CreateOperatingUnitRequest $request)
    {
        $operatingUnit = OperatingUnit::create($request->validated());

        return response()->json([
            'message' => 'Operating unit created successfully',
            'data' => $operatingUnit->load('branch'),
        ], 201);
    }
}
