<?php

namespace App\Http\Responses\Entities;

/**
 * @OA\Schema(
 *     schema="MediaAssetResponse",
 *     title="Media Asset Response",
 *     description="Media asset entity representation",
 *
 *     @OA\Property(property="gallery_id", type="string", example="01JKABC0987654321ZYXWVUTS", description="Owning gallery public_id (ULID)"),
 *     @OA\Property(property="asset_id", type="string", example="01JKDEF0987654321ZYXWVUTS", description="Media asset public_id (ULID)"),
 *     @OA\Property(property="url", type="string", example="https://sushigo.local/storage/media/photo.jpg", description="Public URL of the file"),
 *     @OA\Property(property="filename", type="string", example="photo.jpg", description="Original filename"),
 *     @OA\Property(property="mime_type", type="string", example="image/jpeg", description="File MIME type"),
 *     @OA\Property(property="size", type="integer", example=204800, description="File size in bytes"),
 *     @OA\Property(property="position", type="integer", example=0, description="Display order within the gallery"),
 *     @OA\Property(property="is_primary", type="boolean", example=true, description="Whether this is the gallery's primary asset")
 * )
 */
class MediaAssetResponse
{
    // This class is used only for OpenAPI documentation
}
