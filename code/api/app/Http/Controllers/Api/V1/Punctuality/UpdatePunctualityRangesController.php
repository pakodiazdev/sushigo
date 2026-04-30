<?php

namespace App\Http\Controllers\Api\V1\Punctuality;

use App\Http\Controllers\Controller;
use App\Http\Requests\Punctuality\UpdatePunctualityRangesRequest;
use App\Http\Resources\Punctuality\PunctualityRangeResource;
use App\Http\Responses\Common\ResponseEntity;
use App\Models\PunctualityRange;
use Illuminate\Support\Facades\DB;

/**
 * @OA\Put(
 *   path="/api/v1/punctuality/ranges",
 *   summary="Replace Punctuality Ranges",
 *   description="Atomically replaces all punctuality ranges with the provided list. The backend computes max_seconds and sort_order automatically. The first range must start at min_seconds=0. The last range will be open-ended (max_seconds=null).",
 *   tags={"Punctuality"},
 *   security={{"passport": {}}},
 *
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/UpdatePunctualityRangesRequest")),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Ranges replaced successfully",
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
 *   @OA\Response(response=403, description="Forbidden"),
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class UpdatePunctualityRangesController extends Controller
{
    public function __invoke(UpdatePunctualityRangesRequest $request): ResponseEntity
    {
        $sorted = collect($request->input('ranges'))
            ->sortBy('min_seconds')
            ->values();

        DB::transaction(function () use ($sorted) {
            PunctualityRange::query()->delete();

            $sorted->each(function (array $item, int $index) use ($sorted) {
                $isLast = $index === $sorted->count() - 1;
                $maxSeconds = $isLast
                    ? null
                    : $sorted->get($index + 1)['min_seconds'] - 1;

                PunctualityRange::create([
                    'min_seconds' => $item['min_seconds'],
                    'max_seconds' => $maxSeconds,
                    'bonus_percentage' => $item['bonus_percentage'],
                    'sort_order' => $index + 1,
                ]);
            });
        });

        $ranges = PunctualityRange::orderBy('sort_order')->get();

        $data = $ranges
            ->map(fn (PunctualityRange $r) => (new PunctualityRangeResource($r))->resolve())
            ->values()
            ->all();

        return new ResponseEntity(data: $data);
    }
}
