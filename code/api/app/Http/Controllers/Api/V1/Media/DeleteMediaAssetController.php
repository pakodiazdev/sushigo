<?php

namespace App\Http\Controllers\Api\V1\Media;

use App\Http\Controllers\Controller;
use App\Http\Requests\Media\DeleteMediaAssetRequest;
use App\Http\Responses\Common\ResponseMessage;
use App\Models\MediaAsset;
use App\Services\Media\DeleteMediaAssetService;

/**
 * @OA\Delete(
 *   path="/api/v1/media/assets/{mediaAsset}",
 *   summary="Delete a media asset",
 *   tags={"Media"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="mediaAsset", in="path", required=true, description="Media asset public_id (ULID)", @OA\Schema(type="string")),
 *
 *   @OA\RequestBody(required=false, @OA\JsonContent(ref="#/components/schemas/DeleteMediaAssetRequest")),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Asset deleted successfully",
 *
 *       @OA\JsonContent(ref="#/components/schemas/ResponseMessage")
 *   ),
 *
 *   @OA\Response(response=403, description="Not authorized to delete this asset", @OA\JsonContent(ref="#/components/schemas/ResponseError")),
 *   @OA\Response(response=404, description="Asset not found", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class DeleteMediaAssetController extends Controller
{
    public function __invoke(MediaAsset $mediaAsset, DeleteMediaAssetRequest $request, DeleteMediaAssetService $deleteMediaAsset)
    {
        $deleteMediaAsset($mediaAsset);

        return new ResponseMessage(
            message: 'Media asset deleted successfully'
        );
    }
}
