<?php

namespace App\Http\Controllers\Api\V1\Punctuality;

use App\Http\Controllers\Controller;
use App\Http\Resources\Punctuality\PunctualityBonusGroupResource;
use App\Http\Responses\Common\ResponseEntity;
use App\Models\PunctualityBonusGroup;

/**
 * @OA\Get(
 *   path="/api/v1/punctuality/bonus-groups",
 *   summary="List Punctuality Bonus Groups",
 *   description="Returns all active punctuality bonus groups ordered by name.",
 *   tags={"Punctuality"},
 *   security={{"passport": {}}},
 *
 *   @OA\Response(
 *       response=200,
 *       description="Groups retrieved successfully",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *              @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *              @OA\Schema(@OA\Property(property="data", type="array", @OA\Items(ref="#/components/schemas/PunctualityBonusGroupResponse")))
 *           }
 *       )
 *   ),
 *
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden")
 * )
 */
class ListPunctualityBonusGroupsController extends Controller
{
    public function __invoke(): ResponseEntity
    {
        $groups = PunctualityBonusGroup::where('is_active', true)->orderBy('name')->get();

        $data = $groups
            ->map(fn (PunctualityBonusGroup $g) => (new PunctualityBonusGroupResource($g))->resolve())
            ->values()
            ->all();

        return new ResponseEntity(data: $data);
    }
}
