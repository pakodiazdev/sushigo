<?php

namespace App\Http\Controllers\Api\V1\Media;

use App\Http\Controllers\Controller;
use App\Http\Requests\Media\UploadMediaRequest;
use App\Http\Responses\Common\ResponseEntity;
use App\Services\Media\UploadMediaService;

/**
 * @OA\Post(
 *   path="/api/v1/media/upload",
 *   summary="Upload a media file",
 *   description="Creates a new gallery (when no media_gallery_id is given) or adds to an existing one — the entity that will own this gallery may not exist yet.",
 *   tags={"Media"},
 *   security={{"passport": {}}},
 *
 *   @OA\RequestBody(
 *     required=true,
 *
 *     @OA\MediaType(
 *       mediaType="multipart/form-data",
 *
 *       @OA\Schema(ref="#/components/schemas/UploadMediaRequest")
 *     )
 *   ),
 *
 *   @OA\Response(
 *       response=201,
 *       description="File uploaded successfully",
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
 *   @OA\Response(response=403, description="Not authorized to add media to this gallery", @OA\JsonContent(ref="#/components/schemas/ResponseError")),
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class UploadMediaController extends Controller
{
    public function __invoke(UploadMediaRequest $request, UploadMediaService $uploadMedia)
    {
        $asset = $uploadMedia($request->file('file'), $request->mediaGalleryId(), $request->ownerToken());

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
            ],
            status: 201
        );
    }
}
