<?php

declare(strict_types=1);

namespace App\Http\Responses\Entities;

/**
 * @OA\Schema(
 *   schema="SupplierResponse",
 *   title="Supplier Response",
 *   required={"id", "code", "name", "is_active"},
 *
 *   @OA\Property(property="id", type="string", example="01JKXYZ1234567890ABCDEFGH", description="Public ULID"),
 *   @OA\Property(property="code", type="string", example="MAR-NORTE"),
 *   @OA\Property(property="name", type="string", example="Mar del Norte SA"),
 *   @OA\Property(property="contact_name", type="string", nullable=true, example="Ana López"),
 *   @OA\Property(property="email", type="string", format="email", nullable=true),
 *   @OA\Property(property="phone", type="string", nullable=true),
 *   @OA\Property(property="is_active", type="boolean"),
 *   @OA\Property(property="offerings_count", type="integer", example=3),
 *   @OA\Property(property="created_at", type="string", format="date-time", nullable=true),
 *   @OA\Property(property="updated_at", type="string", format="date-time", nullable=true)
 * )
 */
final class SupplierResponse
{
    // Documentation-only schema. Runtime serialization lives in SupplierResource.
}
