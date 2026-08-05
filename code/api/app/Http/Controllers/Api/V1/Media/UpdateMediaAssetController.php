<?php

namespace App\Http\Controllers\Api\V1\Media;

use App\Http\Controllers\Controller;
use App\Http\Requests\Media\UpdateMediaAssetRequest;
use App\Http\Responses\Common\ResponseEntity;
use App\Models\MediaAsset;
use App\Services\Media\UpdateMediaAssetService;

/**
 * @OA\Patch(
 *   path="/api/v1/media/assets/{mediaAsset}",
 *   summary="Reorder or set primary media asset",
 *   tags={"Media"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="mediaAsset", in="path", required=true, description="Media asset public_id (ULID)", @OA\Schema(type="string")),
 *
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/UpdateMediaAssetRequest")),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Asset updated successfully",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *              @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *              @OA\Schema(@OA\Property(property="data", ref="#/components/schemas/MediaAssetResponse"))
 *           }
 *       )
 *   ),
 *
 *   @OA\Response(response=403, description="Not authorized to modify this asset", @OA\JsonContent(ref="#/components/schemas/ResponseError")),
 *   @OA\Response(response=404, description="Asset not found", @OA\JsonContent(ref="#/components/schemas/ResponseError")),
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class UpdateMediaAssetController extends Controller
{
    public function __invoke(MediaAsset $mediaAsset, UpdateMediaAssetRequest $request, UpdateMediaAssetService $updateMediaAsset)
    {
        $asset = $updateMediaAsset($mediaAsset, $request->assetData());

        return new ResponseEntity(
            data: [
                'gallery_id' => $asset->mediaGallery->public_id,
                'asset_id' => $asset->public_id,
                'url' => $asset->url,
                'filename' => $asset->filename,
                'mime_type' => $asset->mime_type,
                'size' => $asset->size,
                'position' => $asset->position,
                'is_primary' => $asset->is_primary,
            ]
        );
    }
}
