<?php

namespace App\Http\Responses\Entities;

/**
 * @OA\Schema(
 *     schema="UserResponse",
 *     title="User Response",
 *     description="User entity representation",
 *     @OA\Property(property="id", type="integer", example=1, description="User ID"),
 *     @OA\Property(property="name", type="string", example="John Doe", description="User full name"),
 *     @OA\Property(property="email", type="string", format="email", example="john@example.com", description="User email address"),
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
