<?php

namespace App\Http\Controllers\Api\V1\Punctuality;

use App\Http\Controllers\Controller;
use App\Http\Resources\Punctuality\PunctualityRangeResource;
use App\Http\Responses\Common\ResponseEntity;
use App\Models\PunctualityRange;

/**
 * @OA\Get(
 *   path="/api/v1/punctuality/ranges",
 *   summary="List Punctuality Ranges",
 *   description="Returns all punctuality bonus ranges ordered by sort_order.",
 *   tags={"Punctuality"},
 *   security={{"passport": {}}},
 *
 *   @OA\Response(
 *       response=200,
 *       description="Ranges retrieved successfully",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *              @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *              @OA\Schema(@OA\Property(property="data", type="array", @OA\Items(ref="#/components/schemas/PunctualityRangeResponse")))
 *           }
 *       )
 *   ),
 *
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden")
 * )
 */
class ListPunctualityRangesController extends Controller
{
    public function __invoke(): ResponseEntity
    {
        $ranges = PunctualityRange::orderBy('sort_order')->get();

        $data = $ranges
            ->map(fn (PunctualityRange $r) => (new PunctualityRangeResource($r))->resolve())
            ->values()
            ->all();

        return new ResponseEntity(data: $data);
    }
}
