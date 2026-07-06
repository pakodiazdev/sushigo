<?php

namespace App\Http\Controllers\Api\V1\Overtime;

use App\Http\Controllers\Controller;
use App\Http\Requests\Overtime\UpdateOvertimeLftTiersRequest;
use App\Http\Resources\Overtime\OvertimeLftTierResource;
use App\Http\Responses\Common\ResponseEntity;
use App\Models\OvertimeLftTier;
use Illuminate\Support\Facades\DB;

/**
 * @OA\Put(
 *   path="/api/v1/overtime/lft-tiers",
 *   summary="Replace Overtime LFT Tiers",
 *   description="Atomically replaces all overtime LFT tiers with the provided list. Only one tier may have a null up_to_hours (the open-ended, final tier).",
 *   tags={"Overtime"},
 *   security={{"passport": {}}},
 *
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/UpdateOvertimeLftTiersRequest")),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Tiers replaced successfully",
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
 *   @OA\Response(response=403, description="Forbidden"),
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class UpdateOvertimeLftTiersController extends Controller
{
    public function __invoke(UpdateOvertimeLftTiersRequest $request): ResponseEntity
    {
        $sorted = collect($request->input('tiers'))
            ->sortBy(fn (array $t) => $t['up_to_hours'] ?? PHP_FLOAT_MAX)
            ->values();

        DB::transaction(function () use ($sorted) {
            OvertimeLftTier::query()->delete();

            $sorted->each(function (array $item, int $index) {
                OvertimeLftTier::create([
                    'factor' => $item['factor'],
                    'up_to_hours' => $item['up_to_hours'] ?? null,
                    'sort_order' => $index + 1,
                ]);
            });
        });

        $tiers = OvertimeLftTier::orderBy('sort_order')->get();

        $data = $tiers
            ->map(fn (OvertimeLftTier $t) => (new OvertimeLftTierResource($t))->resolve())
            ->values()
            ->all();

        return new ResponseEntity(data: $data);
    }
}
