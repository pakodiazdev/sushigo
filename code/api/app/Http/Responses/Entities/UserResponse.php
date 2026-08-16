<?php

namespace App\Http\Responses\Entities;

/**
 * @OA\Schema(
 *     schema="UserResponse",
 *     title="User Response",
 *     description="User entity representation",
 *
 *     @OA\Property(property="id", type="integer", example=1, description="User ID"),
 *     @OA\Property(property="name", type="string", example="John Doe", description="User full name"),
 *     @OA\Property(property="email", type="string", format="email", example="john@example.com", description="User email address"),
 *     @OA\Property(property="avatar_url", type="string", nullable=true, example="https://api.sushigo.local/storage/avatars/abc.jpg", description="URL of the user's primary avatar photo, or null when none is attached"),
 *     @OA\Property(property="avatar_gallery", type="object", nullable=true, description="The user's avatar gallery (id + every asset in it), null when none is attached — lets the self-service avatar uploader hydrate and manage an existing gallery instead of only ever replacing it wholesale",
 *         @OA\Property(property="id", type="string", example="01JKABC0987654321ZYXWVUTS"),
 *         @OA\Property(property="assets", type="array", @OA\Items(ref="#/components/schemas/MediaAssetResponse"))
 *     ),
 *     @OA\Property(property="email_verified_at", type="string", format="date-time", nullable=true, example="2024-01-15T10:30:00.000000Z", description="Email verification timestamp"),
 *     @OA\Property(property="created_at", type="string", format="date-time", example="2024-01-01T00:00:00.000000Z", description="Creation timestamp"),
 *     @OA\Property(property="updated_at", type="string", format="date-time", example="2024-01-15T10:30:00.000000Z", description="Last update timestamp")
 * )
 */
class UserResponse
{
    // This class is used only for OpenAPI documentation
    // It represents the User entity schema in Swagger
}
