<?php

namespace App\Http\Controllers\Api\V1\Overtime;

use App\Http\Controllers\Controller;
use App\Http\Resources\Overtime\OvertimeLftTierResource;
use App\Http\Responses\Common\ResponseEntity;
use App\Models\OvertimeLftTier;

/**
 * @OA\Get(
 *   path="/api/v1/overtime/lft-tiers",
 *   summary="List Overtime LFT Tiers",
 *   description="Returns all overtime LFT valuation tiers ordered by sort_order.",
 *   tags={"Overtime"},
 *   security={{"passport": {}}},
 *
 *   @OA\Response(
 *       response=200,
 *       description="Tiers retrieved successfully",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *              @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *              @OA\Schema(@OA\Property(property="data", type="array", @OA\Items(ref="#/components/schemas/OvertimeLftTierResponse")))
 *           }
 *       )
 *   ),
 *
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden")
 * )
 */
class ListOvertimeLftTiersController extends Controller
{
    public function __invoke(): ResponseEntity
    {
        $tiers = OvertimeLftTier::orderBy('sort_order')->get();

        $data = $tiers
            ->map(fn (OvertimeLftTier $t) => (new OvertimeLftTierResource($t))->resolve())
            ->values()
            ->all();

        return new ResponseEntity(data: $data);
    }
}
