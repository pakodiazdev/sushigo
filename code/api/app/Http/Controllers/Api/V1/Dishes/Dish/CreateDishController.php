<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Dishes\Dish;

use App\Http\Controllers\Api\V1\Dishes\Dish\Concerns\LoadsDishRelations;
use App\Http\Controllers\Controller;
use App\Http\Requests\Dishes\Dish\StoreDishRequest;
use App\Http\Resources\Dishes\Dish\DishResource;
use App\Models\Dish;
use App\Services\Media\MediaAttachmentService;
use Illuminate\Support\Facades\DB;

/**
 * @OA\Post(
 *   path="/api/v1/dishes",
 *   summary="Create Dish",
 *   tags={"Dishes"},
 *   security={{"passport": {}}},
 *
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/StoreDishRequest")),
 *
 *   @OA\Response(
 *       response=201,
 *       description="Dish created successfully",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *              @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *              @OA\Schema(@OA\Property(property="data", ref="#/components/schemas/DishResponse"))
 *           }
 *       )
 *   ),
 *
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden — requires dishes.create permission"),
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class CreateDishController extends Controller
{
    use LoadsDishRelations;

    public function __invoke(StoreDishRequest $request, MediaAttachmentService $mediaAttachmentService): DishResource
    {
        $dish = DB::transaction(function () use ($request, $mediaAttachmentService) {
            $dish = Dish::create($request->dishData());

            if ($mediaGalleryId = $request->mediaGalleryId()) {
                $mediaAttachmentService($dish, $mediaGalleryId);
            }

            return $dish;
        });

        $dish->load($this->dishEagerLoadRelations());

        return (new DishResource($dish))->setStatusCode(201);
    }
}
