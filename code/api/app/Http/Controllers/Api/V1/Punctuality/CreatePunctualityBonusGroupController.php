<?php

namespace App\Http\Controllers\Api\V1\Punctuality;

use App\Http\Controllers\Controller;
use App\Http\Requests\Punctuality\CreatePunctualityBonusGroupRequest;
use App\Http\Resources\Punctuality\PunctualityBonusGroupResource;
use App\Http\Responses\Common\ResponseEntity;
use App\Models\PunctualityBonusGroup;

/**
 * @OA\Post(
 *   path="/api/v1/punctuality/bonus-groups",
 *   summary="Create Punctuality Bonus Group",
 *   description="Creates a new punctuality bonus group.",
 *   tags={"Punctuality"},
 *   security={{"passport": {}}},
 *
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/CreatePunctualityBonusGroupRequest")),
 *
 *   @OA\Response(
 *       response=201,
 *       description="Group created successfully",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *              @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *              @OA\Schema(@OA\Property(property="data", ref="#/components/schemas/PunctualityBonusGroupResponse"))
 *           }
 *       )
 *   ),
 *
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden"),
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class CreatePunctualityBonusGroupController extends Controller
{
    public function __invoke(CreatePunctualityBonusGroupRequest $request): ResponseEntity
    {
        $group = PunctualityBonusGroup::create([
            'name' => $request->input('name'),
            'weekly_bonus_amount' => $request->input('weekly_bonus_amount'),
            'working_days_divisor' => $request->input('working_days_divisor'),
            'is_active' => true,
        ]);

        return new ResponseEntity(
            data: (new PunctualityBonusGroupResource($group))->resolve(),
            status: 201,
        );
    }
}
