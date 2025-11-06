<?php

namespace App\Http\Responses\Entities;

/**
 * @OA\Schema(
 *     schema="UnitOfMeasureResponse",
 *     title="Unit of Measure Response",
 *     description="Unit of measure entity representation",
 *     @OA\Property(property="id", type="integer", example=1, description="UOM ID"),
 *     @OA\Property(property="code", type="string", example="KG", description="Unique UOM code"),
 *     @OA\Property(property="name", type="string", example="Kilogramo", description="UOM display name"),
 *     @OA\Property(property="symbol", type="string", example="kg", description="UOM symbol"),
 *     @OA\Property(property="precision", type="integer", example=3, description="Decimal precision"),
 *     @OA\Property(property="is_decimal", type="boolean", example=true, description="Whether UOM supports decimals"),
 *     @OA\Property(property="is_active", type="boolean", example=true, description="Active status"),
 *     @OA\Property(property="created_at", type="string", format="date-time", example="2024-01-01T00:00:00.000000Z"),
 *     @OA\Property(property="updated_at", type="string", format="date-time", example="2024-01-15T10:30:00.000000Z")
 * )
 */
class UnitOfMeasureResponse
{
    // This class is used only for OpenAPI documentation
}
